export type Difficulty = 'easy' | 'medium' | 'hard'
export type Grid = number[][]

const REMOVALS: Record<Difficulty, number> = { easy: 39, medium: 46, hard: 51 }
const SIZE = 9

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!]
  }
  return result
}

function candidates(grid: Grid, row: number, col: number): number[] {
  const used = new Set<number>()
  for (let index = 0; index < SIZE; index += 1) {
    used.add(grid[row]![index]!)
    used.add(grid[index]![col]!)
  }
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) used.add(grid[r]![c]!)
  }
  return Array.from({ length: 9 }, (_, index) => index + 1).filter((value) => !used.has(value))
}

function fillSolution(grid: Grid): boolean {
  let bestRow = -1
  let bestCol = -1
  let bestOptions: number[] | undefined
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (grid[row]![col] !== 0) continue
      const options = candidates(grid, row, col)
      if (!options.length) return false
      if (!bestOptions || options.length < bestOptions.length) {
        bestRow = row
        bestCol = col
        bestOptions = options
        if (options.length === 1) break
      }
    }
    if (bestOptions?.length === 1) break
  }
  if (!bestOptions) return true
  for (const value of shuffle(bestOptions)) {
    grid[bestRow]![bestCol] = value
    if (fillSolution(grid)) return true
  }
  grid[bestRow]![bestCol] = 0
  return false
}

/** Count solutions up to `limit`, using the most constrained empty square first. */
export function countSolutions(source: Grid, limit = 2): number {
  const grid = source.map((row) => [...row])
  let count = 0
  function search(): void {
    if (count >= limit) return
    let bestRow = -1
    let bestCol = -1
    let bestOptions: number[] | undefined
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        if (grid[row]![col] !== 0) continue
        const options = candidates(grid, row, col)
        if (!options.length) return
        if (!bestOptions || options.length < bestOptions.length) {
          bestRow = row
          bestCol = col
          bestOptions = options
          if (options.length === 1) break
        }
      }
      if (bestOptions?.length === 1) break
    }
    if (!bestOptions) {
      count += 1
      return
    }
    for (const value of bestOptions) {
      grid[bestRow]![bestCol] = value
      search()
      grid[bestRow]![bestCol] = 0
      if (count >= limit) return
    }
  }
  search()
  return count
}

/** Generate a randomized full solution and remove clues while preserving uniqueness. */
export function createPuzzle(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  const solution = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0))
  fillSolution(solution)
  const puzzle = solution.map((row) => [...row])
  let removed = 0
  for (const index of shuffle(Array.from({ length: SIZE * SIZE }, (_, item) => item))) {
    if (removed >= REMOVALS[difficulty]) break
    const row = Math.floor(index / SIZE)
    const col = index % SIZE
    const previous = puzzle[row]![col]!
    puzzle[row]![col] = 0
    if (countSolutions(puzzle) === 1) removed += 1
    else puzzle[row]![col] = previous
  }
  return { puzzle, solution }
}

/** Return every cell participating in a duplicate row, column, or 3×3 box. */
export function getConflicts(grid: Grid): Set<number> {
  const conflicts = new Set<number>()
  const markDuplicates = (indexes: number[]) => {
    const seen = new Map<number, number[]>()
    for (const index of indexes) {
      const value = grid[Math.floor(index / SIZE)]?.[index % SIZE] ?? 0
      if (value === 0) continue
      const group = seen.get(value) ?? []
      group.push(index)
      seen.set(value, group)
    }
    for (const group of seen.values()) if (group.length > 1) group.forEach((index) => conflicts.add(index))
  }
  for (let row = 0; row < SIZE; row += 1) markDuplicates(Array.from({ length: SIZE }, (_, col) => row * SIZE + col))
  for (let col = 0; col < SIZE; col += 1) markDuplicates(Array.from({ length: SIZE }, (_, row) => row * SIZE + col))
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const indexes: number[] = []
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) indexes.push(row * SIZE + col)
      }
      markDuplicates(indexes)
    }
  }
  return conflicts
}

export function isSolved(grid: Grid): boolean {
  return grid.length === SIZE
    && grid.every((row) => row.length === SIZE && row.every((value) => value >= 1 && value <= 9))
    && getConflicts(grid).size === 0
}

/** Copy the board and fill one empty square with its value from the solution. */
export function fillHint(grid: Grid, solution: Grid, preferredIndex?: number): { grid: Grid; index: number } | null {
  const result = grid.map((row) => [...row])
  const empties = Array.from({ length: SIZE * SIZE }, (_, index) => index)
    .filter((index) => result[Math.floor(index / SIZE)]![index % SIZE] === 0)
  const index = preferredIndex !== undefined && empties.includes(preferredIndex) ? preferredIndex : empties[0]
  if (index === undefined) return null
  const row = Math.floor(index / SIZE)
  const col = index % SIZE
  result[row]![col] = solution[row]![col]!
  return { grid: result, index }
}
