from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """所有 ORM 模型的基类。

    Alembic 通过 Base.metadata 感知表结构变化，
    因此每个模型模块都必须被导入到 app/models/__init__.py，
    否则自动生成迁移时会漏表。
    """


# 后续课程在这里导入模型，例如：
# from app.models.catalog import Attr, AttrValue, Sku, Spu, SkuAttrValue  # noqa: E402,F401
