import { describe, expect, it } from 'vitest'
import { countSolutions, createPuzzle, fillHint, getConflicts, isSolved, type Grid } from './game'

const solution: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

describe('Sudoku game logic', () => {
  it('detects duplicates in rows, columns, and boxes', () => {
    const emptyGrid = () => Array.from({ length: 9 }, () => Array<number>(9).fill(0))
    const rowConflict = emptyGrid()
    rowConflict[0]![0] = 5
    rowConflict[0]![4] = 5
    expect(getConflicts(rowConflict)).toEqual(new Set([0, 4]))

    const columnConflict = emptyGrid()
    columnConflict[0]![0] = 5
    columnConflict[4]![0] = 5
    expect(getConflicts(columnConflict)).toEqual(new Set([0, 36]))

    const boxConflict = emptyGrid()
    boxConflict[0]![0] = 5
    boxConflict[1]![1] = 5
    expect(getConflicts(boxConflict)).toEqual(new Set([0, 10]))
  })

  it('recognizes a complete valid grid as solved', () => {
    expect(isSolved(solution)).toBe(true)
    const incomplete = solution.map((row) => [...row])
    incomplete[0]![0] = 0
    expect(isSolved(incomplete)).toBe(false)
  })

  it('fills a correct empty cell with a hint', () => {
    const puzzle = solution.map((row) => [...row])
    puzzle[4]![4] = 0
    const result = fillHint(puzzle, solution, 40)
    expect(result?.index).toBe(40)
    expect(result?.grid[4]?.[4]).toBe(solution[4]?.[4])
    expect(puzzle[4]?.[4]).toBe(0)
  })

  it('generates a puzzle with exactly one solution and difficulty-specific clue counts', () => {
    const easy = createPuzzle('easy')
    const hard = createPuzzle('hard')
    const clueCount = (grid: Grid) => grid.flat().filter(Boolean).length
    expect(countSolutions(easy.puzzle)).toBe(1)
    expect(countSolutions(hard.puzzle)).toBe(1)
    expect(clueCount(easy.puzzle)).toBeGreaterThan(clueCount(hard.puzzle))
    expect(isSolved(easy.solution)).toBe(true)
  })
})
