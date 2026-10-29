<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  createPuzzle,
  getConflicts,
  type Difficulty,
  type Grid,
} from './game'

const difficulties: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
]

const difficulty = ref<Difficulty>('easy')
const puzzle = ref<Grid>([])
const solution = ref<Grid>([])
const board = ref<Grid>([])
const notes = ref<Set<number>[]>([])
const selected = ref(40)
const noteMode = ref(false)
const elapsed = ref(0)
const hintsUsed = ref(0)
const statusMessage = ref('Pick a square and make your first move.')
const bestTimes = ref<Partial<Record<Difficulty, number>>>({})
let timer: ReturnType<typeof setInterval> | undefined

const rowOf = (index: number) => Math.floor(index / 9)
const colOf = (index: number) => index % 9
const selectedValue = computed(() => board.value[rowOf(selected.value)]?.[colOf(selected.value)] ?? 0)
const conflicts = computed(() => getConflicts(board.value))
const solved = computed(() => board.value.length > 0 && board.value.every((row) => row.every((value) => value !== 0)) && conflicts.value.size === 0)
const formattedTime = computed(() => `${String(Math.floor(elapsed.value / 60)).padStart(2, '0')}:${String(elapsed.value % 60).padStart(2, '0')}`)
const bestTime = computed(() => bestTimes.value[difficulty.value])
const formattedBest = computed(() => bestTime.value === undefined
  ? '—'
  : `${String(Math.floor(bestTime.value / 60)).padStart(2, '0')}:${String(bestTime.value % 60).padStart(2, '0')}`)

function freshNotes() {
  return Array.from({ length: 81 }, () => new Set<number>())
}

function startGame(level = difficulty.value) {
  difficulty.value = level
  const generated = createPuzzle(level)
  puzzle.value = generated.puzzle
  solution.value = generated.solution
  board.value = generated.puzzle.map((row) => [...row])
  notes.value = freshNotes()
  selected.value = board.value.flat().findIndex((value) => value === 0)
  elapsed.value = 0
  hintsUsed.value = 0
  noteMode.value = false
  statusMessage.value = 'Pick a square and make your first move.'
}

function chooseCell(index: number) {
  selected.value = index
  statusMessage.value = ''
}

function enterNumber(value: number) {
  if (solved.value) return
  const row = rowOf(selected.value)
  const col = colOf(selected.value)
  if (puzzle.value[row]?.[col]) return

  if (noteMode.value) {
    const cellNotes = notes.value[selected.value]
    if (cellNotes.has(value)) cellNotes.delete(value)
    else cellNotes.add(value)
    return
  }

  board.value[row]![col] = value
  notes.value[selected.value]!.clear()
  statusMessage.value = ''
}

function clearCell() {
  const row = rowOf(selected.value)
  const col = colOf(selected.value)
  if (puzzle.value[row]?.[col]) return
  board.value[row]![col] = 0
  notes.value[selected.value]!.clear()
  statusMessage.value = ''
}

function toggleNotes() {
  noteMode.value = !noteMode.value
  statusMessage.value = noteMode.value ? 'Notes are on. Add small pencil marks to this square.' : 'Notes are off.'
}

function checkBoard() {
  const count = conflicts.value.size
  statusMessage.value = count
    ? `${count} squares are in conflict. Look for repeated numbers in a row, column, or box.`
    : 'No conflicts so far. Keep going!'
}

function revealHint() {
  const emptyCells = Array.from({ length: 81 }, (_, index) => index)
    .filter((index) => board.value[rowOf(index)]![colOf(index)] === 0)
  const target = emptyCells.includes(selected.value) ? selected.value : emptyCells[0]
  if (target === undefined) return
  board.value[rowOf(target)]![colOf(target)] = solution.value[rowOf(target)]![colOf(target)]!
  notes.value[target]!.clear()
  selected.value = target
  hintsUsed.value += 1
  statusMessage.value = `A correct number has been revealed. Hint${hintsUsed.value === 1 ? '' : 's'} used: ${hintsUsed.value}.`
}

function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault()
    enterNumber(Number(event.key))
    return
  }
  if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    event.preventDefault()
    clearCell()
    return
  }
  const offsets: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }
  if (event.key in offsets) {
    event.preventDefault()
    const next = selected.value + offsets[event.key]!
    if (next >= 0 && next < 81) chooseCell(next)
    return
  }
  if (event.key.toLowerCase() === 'n') toggleNotes()
}

function isPeer(index: number) {
  const row = rowOf(index)
  const col = colOf(index)
  const selectedRow = rowOf(selected.value)
  const selectedCol = colOf(selected.value)
  return row === selectedRow || col === selectedCol || (Math.floor(row / 3) === Math.floor(selectedRow / 3) && Math.floor(col / 3) === Math.floor(selectedCol / 3))
}

function cellClasses(index: number) {
  const value = board.value[rowOf(index)]![colOf(index)]!
  return {
    'is-selected': selected.value === index,
    'is-peer': selected.value !== index && isPeer(index),
    'is-same-number': selectedValue.value !== 0 && value === selectedValue.value,
    'is-given': puzzle.value[rowOf(index)]![colOf(index)] !== 0,
    'is-conflict': conflicts.value.has(index),
    'box-right': colOf(index) === 2 || colOf(index) === 5,
    'box-bottom': rowOf(index) === 2 || rowOf(index) === 5,
  }
}

watch(solved, (isSolved) => {
  if (!isSolved) return
  const previous = bestTimes.value[difficulty.value]
  if (previous === undefined || elapsed.value < previous) {
    bestTimes.value = { ...bestTimes.value, [difficulty.value]: elapsed.value }
    localStorage.setItem('sudoku-best-times', JSON.stringify(bestTimes.value))
  }
  statusMessage.value = `Puzzle complete${hintsUsed.value ? ` with ${hintsUsed.value} hint${hintsUsed.value === 1 ? '' : 's'}` : ' — beautifully done'}!`
})

onMounted(() => {
  try {
    bestTimes.value = JSON.parse(localStorage.getItem('sudoku-best-times') ?? '{}') as Partial<Record<Difficulty, number>>
  } catch {
    bestTimes.value = {}
  }
  startGame()
  timer = setInterval(() => {
    if (!solved.value) elapsed.value += 1
  }, 1000)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Sudoku home">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span>still<span class="brand-dot">.</span></span>
      </a>
      <div class="topbar-right">
        <span class="daily-label"><span class="live-dot"></span> A little space to think</span>
        <button class="icon-button" type="button" aria-label="Start a new game" title="New game" @click="startGame()">↻</button>
      </div>
    </header>

    <section class="intro">
      <div>
        <p class="eyebrow">THE DAILY RESET</p>
        <h1>Find your <em>focus.</em></h1>
        <p class="intro-copy">A quiet moment, one square at a time.</p>
      </div>
      <div class="game-stats" aria-label="Game statistics">
        <div class="stat-item"><span class="stat-label">TIME</span><strong>{{ formattedTime }}</strong></div>
        <span class="stat-divider"></span>
        <div class="stat-item"><span class="stat-label">BEST <span class="best-level">{{ difficulty.toUpperCase() }}</span></span><strong>{{ formattedBest }}</strong></div>
      </div>
    </section>

    <section class="game-layout" aria-label="Sudoku game">
      <div class="board-column">
        <div class="difficulty-row" aria-label="Difficulty">
          <span class="difficulty-caption">TAKE IT</span>
          <div class="difficulty-switch">
            <button
              v-for="level in difficulties"
              :key="level.id"
              type="button"
              :class="{ active: difficulty === level.id }"
              :aria-pressed="difficulty === level.id"
              @click="startGame(level.id)"
            >{{ level.label }}</button>
          </div>
          <button class="new-game-link" type="button" @click="startGame()"><span aria-hidden="true">＋</span> New puzzle</button>
        </div>

        <div class="board-frame">
          <div class="sudoku-board" role="grid" aria-label="Sudoku board">
            <template v-for="row in 9" :key="row">
              <button
                v-for="col in 9"
                :key="`${row}-${col}`"
                class="cell"
                :class="cellClasses((row - 1) * 9 + col - 1)"
                type="button"
                role="gridcell"
                :aria-label="`Row ${row}, column ${col}${board[row - 1]?.[col - 1] ? `, ${board[row - 1]?.[col - 1]}` : ', empty'}${puzzle[row - 1]?.[col - 1] ? ', given' : ''}`"
                :aria-selected="selected === (row - 1) * 9 + col - 1"
                @click="chooseCell((row - 1) * 9 + col - 1)"
              >
                <span v-if="board[row - 1]?.[col - 1]" class="cell-value">{{ board[row - 1]?.[col - 1] }}</span>
                <span v-else-if="notes[(row - 1) * 9 + col - 1]?.size" class="notes-grid" aria-hidden="true">
                  <span v-for="note in 9" :key="note" :class="{ 'note-present': notes[(row - 1) * 9 + col - 1]?.has(note) }">{{ notes[(row - 1) * 9 + col - 1]?.has(note) ? note : '' }}</span>
                </span>
              </button>
            </template>
          </div>
        </div>

        <div class="board-legend"><span><i class="legend-given"></i> Given</span><span><i class="legend-entry"></i> Your numbers</span><span class="keyboard-hint">Use arrow keys to move</span></div>
      </div>

      <aside class="side-panel">
        <div class="panel-heading">
          <span class="panel-kicker">YOUR MOVE</span>
          <span class="turn-mark" aria-hidden="true">✳</span>
        </div>
        <p class="panel-prompt">Choose a number<br />for this square.</p>
        <div class="number-pad" aria-label="Number pad">
          <button v-for="number in 9" :key="number" type="button" :class="{ 'number-active': selectedValue === number }" :aria-label="`Enter ${number}`" @click="enterNumber(number)">{{ number }}</button>
          <button class="erase-button" type="button" aria-label="Erase selected square" @click="clearCell"><span aria-hidden="true">⌫</span></button>
        </div>
        <button class="notes-toggle" :class="{ 'notes-on': noteMode }" type="button" :aria-pressed="noteMode" @click="toggleNotes">
          <span class="pencil-icon" aria-hidden="true">✎</span><span>Notes</span><kbd>N</kbd><span class="toggle-track"><i></i></span>
        </button>
        <div class="panel-rule"></div>
        <div class="assist-actions">
          <button type="button" class="assist-button" @click="checkBoard"><span class="assist-icon check-icon" aria-hidden="true">✓</span><span><strong>Check board</strong><small>Find any conflicts</small></span><span class="action-arrow" aria-hidden="true">→</span></button>
          <button type="button" class="assist-button" @click="revealHint"><span class="assist-icon hint-icon" aria-hidden="true">✧</span><span><strong>Get a hint</strong><small>Reveal one number</small></span><span class="action-arrow" aria-hidden="true">→</span></button>
        </div>
        <p class="status-message" role="status" aria-live="polite">{{ statusMessage }}</p>
        <p class="gentle-note"><span aria-hidden="true">✦</span> No rush. The best move is the one you see.</p>
      </aside>
    </section>

    <footer class="footer"><span>MADE FOR A CLEARER MOMENT</span><span>PUZZLE <b>№ 001</b></span><span>© STILL, 2026</span></footer>
  </main>
</template>
