<script setup>
import Callout from '../components/Callout.vue'
import CodeBlock from '../components/CodeBlock.vue'
import PageNav from '../components/PageNav.vue'

const codeSwitch = `
# 1. 起 SQL Server（默认 profile 不会启动它）
docker compose --profile mssql up -d

# 2. 装 ODBC Driver 18 for SQL Server（Windows 上必须）

# 3. 建库 —— 容器只带 master/msdb，没有业务库
docker exec mall-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Mall@Passw0rd' -C -Q "if db_id('mall') is null create database mall;"

# 4. 装 Python 驱动
pip install -e ".[mssql]"

# 5. 改 .env 里的 DATABASE_URL

# 6. 验证
python scripts/smoke.py health
python scripts/smoke.py inspect -r 6
`

const codeSnapshot = `ALTER DATABASE mall SET READ_COMMITTED_SNAPSHOT ON;`

const codeUpsert = `
-- PostgreSQL：干净、并发安全
insert into stock (sku_id, qty) values (1, 10)
on conflict (sku_id) do update set qty = stock.qty + excluded.qty;

-- SQL Server：只有 MERGE，而且并发下有已知死锁
merge stock as t
using (select 1 as sku_id, 10 as qty) as s on t.sku_id = s.sku_id
when matched then update set qty = t.qty + s.qty
when not matched then insert (sku_id, qty) values (s.sku_id, s.qty);
`

const codeLock = `
-- PostgreSQL
select * from stock where sku_id = 1 for update;

-- SQL Server
select * from stock with (updlock, rowlock) where sku_id = 1;
`

const codePage = `
-- PostgreSQL
select * from orders order by id limit 20 offset 40;

-- SQL Server（必须带 order by）
select * from orders order by id offset 40 rows fetch next 20 rows only;
`

const codeBlocking = `
select
  r.session_id,
  r.blocking_session_id,
  r.wait_type,
  r.wait_time / 1000.0 as wait_sec,
  t.text as sql_text
from sys.dm_exec_requests r
cross apply sys.dm_exec_sql_text(r.sql_handle) t
where r.blocking_session_id <> 0;
`

const ddlRows = [
  ['bigserial primary key', 'bigint identity(1,1) primary key', ''],
  ['timestamptz', 'datetimeoffset', '别用 datetime，精度只有 3.33ms'],
  ['numeric(12,2)', 'decimal(12,2)', '完全等价'],
  ['boolean', 'bit', ''],
  ['text', 'nvarchar(max)', ''],
  ['varchar(n)', 'nvarchar(n)', '含中文一律 n 前缀'],
  ['jsonb', 'nvarchar(max)', '有 JSON 函数，但没有索引能力'],
  ['uuid', 'uniqueidentifier', ''],
  ['default now()', 'default sysdatetimeoffset()', ''],
]

const monitorRows = [
  ['当前有多少连接', 'pg_stat_activity', 'sys.dm_exec_sessions'],
  ['谁在等锁', 'pg_locks + wait_event', 'blocking_session_id'],
  ['正在跑什么 SQL', 'pg_stat_activity.query', 'sys.dm_exec_requests + dm_exec_sql_text'],
  ['有没有空闲事务', "state = 'idle in transaction'", 'open_transaction_count > 0'],
  ['慢查询历史', 'pg_stat_statements', 'Query Store'],
]

const pitfalls = [
  ['MERGE 并发死锁', '用唯一索引 + 捕获 2627 重试，别硬刚'],
  ['锁升级', '单语句锁超过约 5000 行会升表锁，PG 没这回事。批量更新要分批'],
  ['READ_COMMITTED_SNAPSHOT 默认关闭', '不主动开，读就会阻塞写'],
  ['nvarchar 和 varchar 混用', '隐式转换导致索引失效，性能问题头号来源'],
  ['标识列不能显式插值', '迁移数据要先 SET IDENTITY_INSERT ON'],
  ['排序规则默认不区分大小写', "'ABC' = 'abc' 返回 true，和 PG 相反"],
  ['datetime 精度只有 3.33ms', '一律用 datetime2 或 datetimeoffset'],
  ['容器要 2GB 内存', '不够会直接退出，日志只有一行提示'],
  ['连接串里的 @ 要编码', '写成 %40，否则连接串被截断'],
]

const courseRows = [
  ['M0-02 事务边界', '现象从「连接被占」变成「表被锁」；监控换 sys.dm_exec_requests'],
  ['M0-03 幂等', '错误码 23505 → 2627/2601；ON CONFLICT 改成唯一索引 + 重试'],
  ['M1-05 软删除', '不用改，筛选索引语法相同'],
  ['M3-04 超卖', 'for update → with (updlock, rowlock)；条件更新两边通用'],
  ['M4-02 台账对账', '窗口函数两边都支持，SQL 基本能直接跑'],
  ['M6-03 迁移', 'create index concurrently → with (online = on)，企业版'],
]
</script>

<template>
  <div class="page">
    <div class="eyebrow">参考 · 数据库方言</div>
    <h1>SQL Server 对照</h1>

    <p class="lead">
      课程按 PostgreSQL 讲原理，公司用 SQL Server。<br />
      原理在哪都一样，语法和锁模型不一样 —— 这一页只记真的会踩到的差异。
    </p>

    <Callout type="info">
      <strong>绝大部分课不用改。</strong>
      库存四量、优惠分摊、单据模型、状态机 —— 这些都和数据库无关。
      真正受影响的是事务、幂等、锁这三块。
    </Callout>

    <h2>一、切换步骤</h2>

    <CodeBlock :code="codeSwitch" lang="powershell" title="终端" open />

    <Callout type="warn">
      <strong>两个最常见的启动失败：</strong><br />
      ① 密码里的 <code>@</code> 没编码 —— 必须写成 <code>%40</code>，否则连接串被截断<br />
      ② 驱动名不对 —— 没装 ODBC 18 时，系统自带的老驱动就叫 <code>SQL Server</code>，
      连接串要改成 <code>driver=SQL+Server&amp;Encrypt=no</code>
    </Callout>

    <h2>二、最大的差异：并发模型</h2>
    <p>这是唯一会改变你<strong>判断方式</strong>的差异，其余都只是语法。</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th></th><th>PostgreSQL</th><th>SQL Server（默认）</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>读会被写阻塞吗</td>
            <td>不会（MVCC 快照）</td>
            <td><strong class="bad">会</strong>（共享锁 vs 排他锁）</td>
          </tr>
          <tr>
            <td>长事务的危害</td>
            <td>快照膨胀、vacuum 受阻</td>
            <td>其他请求直接被卡住</td>
          </tr>
          <tr>
            <td>典型现象</td>
            <td><code>idle in transaction</code> 堆积</td>
            <td><code>blocking_session_id</code> 一片</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p>同一段代码，两边表现完全不同：</p>

    <div class="compare">
      <div class="cmp-col bad-col">
        <div class="cmp-head">SQL Server 默认</div>
        <p>事务里发短信 3 秒 → <strong>这张表被锁 3 秒</strong>，任何想读它的人全部排队。</p>
      </div>
      <div class="cmp-col ok-col">
        <div class="cmp-head">PostgreSQL</div>
        <p>事务里发短信 3 秒 → 连接被占 3 秒，但其他人<strong>照常查数据</strong>，只是池子少一个。</p>
      </div>
    </div>

    <p>想让它接近 PostgreSQL 的行为，开一个数据库选项就行：</p>

    <CodeBlock :code="codeSnapshot" lang="sql" open />

    <Callout type="success">
      开了之后读走行版本，不再阻塞写。代价是 tempdb 压力变大。<br />
      报表多、读多写少的系统，开了体验好很多。
    </Callout>

    <h2>三、DDL 对照</h2>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>PostgreSQL</th><th>SQL Server</th><th>备注</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in ddlRows" :key="i">
            <td><code>{{ r[0] }}</code></td>
            <td><code>{{ r[1] }}</code></td>
            <td class="muted">{{ r[2] }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Callout type="success">
      <strong>软删除的唯一索引，两边语法一样：</strong><br />
      <code>create unique index ... where deleted_at is null</code><br />
      这是 SQL Server 的「筛选索引」，和 PG 的部分索引是同一个东西。M1-05 那节不用改。
    </Callout>

    <h2>四、写法对照</h2>

    <h3>插入并拿回自增 ID</h3>
    <div class="pair">
      <div class="pair-item"><span class="pair-tag">PG</span><code>insert ... returning id</code></div>
      <div class="pair-item"><span class="pair-tag">MSSQL</span><code>insert ... output inserted.id ...</code></div>
    </div>

    <h3>Upsert</h3>
    <CodeBlock :code="codeUpsert" lang="sql" />

    <Callout type="danger">
      <strong>MERGE 在并发下有已知死锁问题</strong>，微软自己的文档也承认。<br />
      生产环境稳妥做法：唯一索引 + 捕获 <code>2627/2601</code> 错误后重试，别迷信 MERGE。<br />
      这对 M0-03 幂等那节影响最大 —— "让唯一索引挡住重复"依然成立，只是异常码不同。
    </Callout>

    <h3>行锁</h3>
    <CodeBlock :code="codeLock" lang="sql" />

    <h3>分页</h3>
    <CodeBlock :code="codePage" lang="sql" />

    <p class="muted" style="font-size: 13px">
      M2-02 讲的游标分页 <code>where id &lt; :last_id</code> 两边都能用，而且都更快。
    </p>

    <h2>五、监控对照</h2>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>想知道</th><th>PostgreSQL</th><th>SQL Server</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in monitorRows" :key="i">
            <td>{{ r[0] }}</td>
            <td><code>{{ r[1] }}</code></td>
            <td><code>{{ r[2] }}</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <p>查「谁堵住了谁」：</p>
    <CodeBlock :code="codeBlocking" lang="sql" />

    <h2>六、踩坑清单</h2>
    <p>按踩到的频率排。</p>

    <div class="pit-list">
      <div v-for="(p, i) in pitfalls" :key="i" class="pit">
        <span class="pit-num mono">{{ String(i + 1).padStart(2, '0') }}</span>
        <div>
          <div class="pit-t">{{ p[0] }}</div>
          <div class="pit-d">{{ p[1] }}</div>
        </div>
      </div>
    </div>

    <h2>七、课程里哪些地方要跟着改</h2>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>课</th><th>改动</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in courseRows" :key="i">
            <td>{{ r[0] }}</td>
            <td class="muted">{{ r[1] }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Callout type="info">
      其余章节讲的是原理，和数据库无关，一个字都不用改。
    </Callout>

    <PageNav
      :prev="{ path: '/lesson/M6-04', title: 'M6-04 秒杀演练' }"
      :next="{ path: '/', title: '返回课程首页' }"
    />
  </div>
</template>

<style scoped>
.bad {
  color: var(--danger);
}

.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 20px 0;
}

.cmp-col {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 15px 17px;
  background: var(--surface);
}

.cmp-col p {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
}

.cmp-head {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 7px;
}

.bad-col {
  border-color: color-mix(in srgb, var(--danger) 25%, transparent);
  background: var(--danger-soft);
}

.bad-col .cmp-head {
  color: var(--danger);
}

.ok-col {
  border-color: color-mix(in srgb, var(--success) 25%, transparent);
  background: var(--success-soft);
}

.ok-col .cmp-head {
  color: var(--success);
}

.pair {
  display: grid;
  gap: 7px;
  margin-bottom: 20px;
}

.pair-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.pair-tag {
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--surface-3);
  color: var(--text-3);
  flex: none;
  min-width: 46px;
  text-align: center;
}

.pit-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 24px;
}

.pit {
  display: flex;
  gap: 14px;
  padding: 11px 14px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.pit:hover {
  background: var(--surface-2);
}

.pit-num {
  font-size: 11px;
  font-weight: 700;
  color: var(--danger);
  flex: none;
  padding-top: 2px;
}

.pit-t {
  font-size: 13.5px;
  font-weight: 650;
  margin-bottom: 2px;
}

.pit-d {
  font-size: 12.5px;
  color: var(--text-3);
  line-height: 1.7;
}

@media (max-width: 700px) {
  .compare {
    grid-template-columns: 1fr;
  }
}
</style>
