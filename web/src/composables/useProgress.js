import { ref } from 'vue'

const KEY = 'lm-learned'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

const learned = ref(read())
const learnedSet = ref(new Set(learned.value))

function persist() {
  learned.value = [...learnedSet.value]
  localStorage.setItem(KEY, JSON.stringify(learned.value))
}

export function isLearned(path) {
  return learnedSet.value.has(path)
}

export function markLearned(path) {
  if (!learnedSet.value.has(path)) {
    learnedSet.value.add(path)
    learnedSet.value = new Set(learnedSet.value)
    persist()
  }
}

export function unmarkLearned(path) {
  if (learnedSet.value.has(path)) {
    learnedSet.value.delete(path)
    learnedSet.value = new Set(learnedSet.value)
    persist()
  }
}

export function toggleLearned(path) {
  if (learnedSet.value.has(path)) unmarkLearned(path)
  else markLearned(path)
}

export function useProgress() {
  return { learned, learnedSet, isLearned, markLearned, unmarkLearned, toggleLearned }
}
