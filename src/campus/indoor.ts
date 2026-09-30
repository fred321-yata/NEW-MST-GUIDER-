import { addEdge, createGraph, shortestPath } from './graph'
import type { Graph } from './graph'
import type { Point2D } from './geo'
import { CAMPUS_IMAGE_ASPECT } from './geo'

export type RoomKind = 'classroom' | 'office' | 'clinic' | 'library' | 'lab' | 'comfort-room'

export type IndoorRoom = {
  id: string
  name: string
  floor: number
  kind: RoomKind
  rect: { x: number; y: number; w: number; h: number }
  nodeId: string
}

export type MarkerKind = 'entrance' | 'exit' | 'stairs' | 'hallway'

export type IndoorMarker = {
  id: string
  floor: number
  kind: MarkerKind
  label: string
  image: Point2D
  color: string
}

export const MARKER_COLORS = {
  entrance: '#2b6ce6',
  exit: '#e02b2b',
  hallway: '#1f9d3a',
  stairs: '#7a5df0',
}

function rect(x: number, y: number, w: number, h: number) {
  return { x, y, w, h }
}

/* ── Floor 1 rooms (MST building 1st floor) ───────────────────────────────── */

const FLOOR1_ROOMS: IndoorRoom[] = [
  { id: 'mst-101-f1', name: 'MST 101', floor: 1, kind: 'classroom', rect: rect(4.5, 29.8, 6.6, 7.2), nodeId: 'f1-left-top' },
  { id: 'mst-102-f1', name: 'MST 102', floor: 1, kind: 'classroom', rect: rect(4.5, 36.7, 6.6, 7.3), nodeId: 'f1-left-top' },
  { id: 'mst-103-f1', name: 'MST 103', floor: 1, kind: 'classroom', rect: rect(4.5, 44.0, 6.6, 7.3), nodeId: 'f1-left-bottom' },
  { id: 'mst-104-f1', name: 'MST 104', floor: 1, kind: 'classroom', rect: rect(4.5, 51.3, 6.6, 7.3), nodeId: 'f1-left-bottom' },
  { id: 'CCJE FACULTY OFFICE', name: 'CCJE FACULTY OFFICE', floor: 1, kind: 'classroom', rect: rect(4.5, 59.0, 6.6, 9.3), nodeId: 'f1-left-bottom' },
  { id: 'CCJE DEANS LIST', name: 'CCJE DEANS LIST', floor: 1, kind: 'classroom', rect: rect(4.5,68.0, 6.6, 9.3), nodeId: 'f1-left-bottom' },
  { id: 'MST 107', name: 'MST 107', floor: 1, kind: 'classroom', rect: rect(33.5, 76, 6.6, 12.3), nodeId: 'f1-left-bottom' },
  { id: 'CTE GEN ED PROGRAM HEAD OFFICE', name: 'CTE GEN ED PROGRAM HEAD OFFICE', floor: 1, kind: 'classroom', rect: rect(27, 76, 6.6, 12.3), nodeId: 'f1-left-bottom' },
  { id: 'CTE GEN ED FACULTY OFFICE', name: 'CTE GEN ED FACULTY OFFICE', floor: 1, kind: 'classroom', rect: rect(11.5, 76, 16, 12.3), nodeId: 'f1-left-bottom' },
  { id: 'cl-13', name: 'CL 13', floor: 1, kind: 'classroom', rect: rect(92, 27.8, 6.6, 10.2), nodeId: 'f1-left-top' },
  { id: 'cl-12', name: 'CL12', floor: 1, kind: 'classroom', rect: rect(92, 36.7, 6.6, 12.3), nodeId: 'f1-left-top' },
  { id: 'comlab', name: 'ComLab (elementary)', floor: 1, kind: 'classroom', rect: rect(92, 48.0, 6.6, 12.3), nodeId: 'f1-left-bottom' },
  { id: 'tailor-session', name: 'Tailoring Session', floor: 1, kind: 'classroom', rect: rect(92, 59.3, 6.6, 12.3), nodeId: 'f1-left-bottom' }, 
  { id: 'clinic', name: 'CLINIC', floor: 1, kind: 'clinic', rect: rect(40, 76, 6.6, 12.3), nodeId: 'f1-center-bottom' },
  { id: 'nstp-rotc-office', name: 'NSTP/ROTC OFFICE', floor: 1, kind: 'office', rect: rect(55, 76, 6.6, 12.3), nodeId: 'f1-right-bottom' },
  { id: 'mst-108-f1', name: 'MST 108', floor: 1, kind: 'classroom', rect: rect(61.5, 76, 6.6, 12.3), nodeId: 'f1-right-bottom' },
  { id: 'mst-109-f1', name: 'MST 109', floor: 1, kind: 'classroom', rect: rect(68.1, 76, 6.6, 12.3), nodeId: 'f1-right-bottom' },
  { id: 'tailor', name: 'TAILOR / GRADE-VII RUBY', floor: 1, kind: 'classroom', rect: rect(74.7, 76, 6.6, 12.3), nodeId: 'f1-right-bottom' },
  { id: 'property-office', name: 'Property management office', floor: 1, kind: 'office', rect: rect(83, 76, 6.6, 12.3), nodeId: 'f1-right-bottom' },
  { id: 'cr-girls-f1', name: 'comfort room', floor: 1, kind: 'comfort-room', rect: rect(4.5, 79, 6.6, 12.3), nodeId: 'f1-left-bottom' },
  { id: 'cr-girls-f1', name: 'comfort room', floor: 1, kind: 'comfort-room', rect: rect(92, 79, 6.6, 12.3), nodeId: 'f1-left-bottom' },

]

/* ── Floor 2 rooms (MST building 2nd floor) ───────────────────────────────── */

const FLOOR2_ROOMS: IndoorRoom[] = [
  { id: 'cl10-f2', name: 'CL10', floor: 2, kind: 'classroom', rect: rect(4.5, 31.5, 6.6, 10.2), nodeId: 'f2-left-top' },
  { id: 'mst-202', name: 'MST 202', floor: 2, kind: 'classroom', rect: rect(4.5, 41.7, 6.6, 12.3), nodeId: 'f2-left-top' },
  { id: 'mst-203', name: 'MST 203', floor: 2, kind: 'classroom', rect: rect(4.5, 54.0, 6.6, 12.3), nodeId: 'f2-left-bottom' },
  { id: 'mst-204', name: 'MST 204', floor: 2, kind: 'classroom', rect: rect(4.5, 66.3, 6.6, 12.3), nodeId: 'f2-left-bottom' },
  { id: 'thm-fbs-laboratory', name: 'THM_FBS LABORATORY', floor: 2, kind: 'lab', rect: rect(4.5, 79.0, 6.6, 12.3), nodeId: 'f2-left-bottom' },
  { id: 'mst-205', name: 'MST 205', floor: 2, kind: 'classroom', rect: rect(11, 78.0, 6, 12.3), nodeId: 'f2-left-bottom' },
  { id: 'mst-206', name: 'MST 206', floor: 2, kind: 'classroom', rect: rect(17.5, 78.0, 6, 12.3), nodeId: 'f2-mid-bottom' },
  { id: 'mst-207', name: 'MST 207', floor: 2, kind: 'classroom', rect: rect(24.0, 78.0, 6, 12.3), nodeId: 'f2-mid-bottom' },
  { id: 'mst-208', name: 'MST 208', floor: 2, kind: 'classroom', rect: rect(30.0, 78.0, 6, 12.3), nodeId: 'f2-center-bottom' },
  { id: 'mst-209', name: 'MST 209', floor: 2, kind: 'classroom', rect: rect(36.0, 78.0, 6, 12.3), nodeId: 'f2-center-bottom' },
  { id: 'mst-210', name: 'MST 210', floor: 2, kind: 'classroom', rect: rect(42.0, 78.0, 6, 12.3), nodeId: 'f2-center-bottom' },
  { id: 'mst-211', name: 'MST 211', floor: 2, kind: 'classroom', rect: rect(53.1, 78.0, 6.6, 12.3), nodeId: 'f2-right-bottom' },
  { id: 'mst-212', name: 'MST 212', floor: 2, kind: 'classroom', rect: rect(59.7, 78.0, 6.6, 12.3), nodeId: 'f2-right-bottom' },
  { id: 'mst-213', name: 'MST 213', floor: 2, kind: 'classroom', rect: rect(66.3, 78.0, 6.6, 12.3), nodeId: 'f2-right-bottom' },
  { id: 'mst-214', name: 'MST 214', floor: 2, kind: 'classroom', rect: rect(72.9, 78.0, 6.6, 12.3), nodeId: 'f2-right-bottom' },
  { id: 'mst-215', name: 'MST 215', floor: 2, kind: 'classroom', rect: rect(79.5, 78.0, 6.6, 12.3), nodeId: 'f2-right-bottom' },
  { id: 'college-library-extension', name: 'COLLEGE LIBRARY EXTENSION', floor: 2, kind: 'office', rect: rect(86.1, 78.0, 5.5, 12.3), nodeId: 'f2-right-bottom' },
  { id: 'bed-department', name: 'BASIC EDUCATION DEPARTMENT (SECONDARY)', floor: 2, kind: 'office', rect: rect(91.0, 62.0, 6.6, 30.0), nodeId: 'f2-right-bottom' },
  { id: 'mst-221', name: 'MST 221', floor: 2, kind: 'classroom', rect: rect(91.0, 27.5, 6.6, 10.2), nodeId: 'f2-right-top' },
  { id: 'mst-220', name: 'MST 220', floor: 2, kind: 'classroom', rect: rect(91.0, 38.0, 6.6, 12.3), nodeId: 'f2-right-top' },
  { id: 'gs-emerald', name: 'GS-EMERALD', floor: 2, kind: 'classroom', rect: rect(91.0, 49.0, 6.6, 12.3), nodeId: 'f2-right-top' },
]

/* ── Floor 3 rooms (MST building 3rd floor) ───────────────────────────────── */

const FLOOR3_ROOMS: IndoorRoom[] = [
  { id: 'mst-305', name: 'MST 305', floor: 3, kind: 'classroom', rect: rect(4.5, 31.5, 6.6, 10.2), nodeId: 'f3-left-top' },
  { id: 'cl10-f3', name: 'CL10', floor: 3, kind: 'classroom', rect: rect(4.5, 41.7, 6.6, 12.3), nodeId: 'f3-left-top' },
  { id: 'css-net-lab', name: 'CSS/NET LAB', floor: 3, kind: 'lab', rect: rect(4.5, 54.0, 7.0, 20.0), nodeId: 'f3-left-bottom' },
  { id: 'cl9', name: 'CL9', floor: 3, kind: 'classroom', rect: rect(12.0, 76.0, 11.5, 12.3), nodeId: 'f3-left-bottom' },
  { id: 'cl8', name: 'CL8', floor: 3, kind: 'classroom', rect: rect(23.5, 76.0, 6.6, 12.3), nodeId: 'f3-mid-bottom' },
  { id: 'cl7', name: 'CL7', floor: 3, kind: 'classroom', rect: rect(30.0, 76.0, 6.6, 12.3), nodeId: 'f3-mid-bottom' },
  { id: 'cl6', name: 'CL6', floor: 3, kind: 'classroom', rect: rect(36.5, 76.0, 6.6, 12.3), nodeId: 'f3-center-bottom' },
  { id: 'cl5', name: 'CL5', floor: 3, kind: 'classroom', rect: rect(43.0, 76.0, 6.6, 12.3), nodeId: 'f3-center-bottom' },
  { id: 'cl4', name: 'CL4', floor: 3, kind: 'classroom', rect: rect(53.0, 76.0, 6.6, 12.3), nodeId: 'f3-center-bottom' },
  { id: 'server-room', name: 'SERVER ROOM', floor: 3, kind: 'office', rect: rect(59.5, 76.0, 6.6, 12.3), nodeId: 'f3-right-bottom' },
  { id: 'cl1', name: 'CL1', floor: 3, kind: 'classroom', rect: rect(66.1, 76.0, 9.0, 12.3), nodeId: 'f3-right-bottom' },
  { id: 'cl2', name: 'CL2', floor: 3, kind: 'classroom', rect: rect(75.0, 76.0, 8.0, 12.3), nodeId: 'f3-right-bottom' },
  { id: 'cl3', name: 'CL3', floor: 3, kind: 'classroom', rect: rect(83.3, 76.0, 8.0, 12.3), nodeId: 'f3-right-bottom' },
  { id: 'cr-boys-f3', name: 'comfort room', floor: 3, kind: 'comfort-room', rect: rect(91.9, 76, 6.6, 12.3), nodeId: 'f3-right-bottom' },
  { id: 'cr-girls-f3', name: 'comfort room', floor: 3, kind: 'comfort-room', rect: rect(4.5, 76, 6.6, 12.3), nodeId: 'f3-left-bottom' },
  { id: 'mst-301', name: 'MST 301', floor: 3, kind: 'classroom', rect: rect(91.0, 28.5, 6.6, 10.2), nodeId: 'f3-right-top' },
  { id: 'mst-302', name: 'MST 302', floor: 3, kind: 'classroom', rect: rect(91.0, 38.7, 6.6, 12.3), nodeId: 'f3-right-top' },
  { id: 'mst-303', name: 'MST 303', floor: 3, kind: 'classroom', rect: rect(91.0, 50.0, 6.6, 12.3), nodeId: 'f3-right-top' },
  { id: 'mst-304', name: 'MST 304', floor: 3, kind: 'classroom', rect: rect(91.0, 62.3, 6.6, 12.3), nodeId: 'f3-right-top' },
]

/* ── Floor 4 rooms (MST building 4th floor) ───────────────────────────────── */

const FLOOR4_ROOMS: IndoorRoom[] = [
  { id: 'library-f4', name: 'LIBRARY', floor: 4, kind: 'library', rect: rect(4.5, 31.5, 6.6, 43.5), nodeId: 'f4-left-top' },
  { id: 'library-f4-bottom', name: 'LIBRARY', floor: 4, kind: 'library', rect: rect(4.5, 76.0, 15.5, 12.3), nodeId: 'f4-left-bottom' },
  { id: 'mst-409-f4', name: 'MST 409', floor: 4, kind: 'classroom', rect: rect(59.5, 76.0, 6.6, 12.3), nodeId: 'f4-right-bottom' },
  { id: 'mst-414-f4', name: 'MST 414', floor: 4, kind: 'classroom', rect: rect(20.0, 76.0, 6.6, 12.3), nodeId: 'f4-mid-bottom' },
  { id: 'mst-413', name: 'MST 413', floor: 4, kind: 'classroom', rect: rect(27.0, 76.0, 6.6, 12.3), nodeId: 'f4-mid-bottom' },
  { id: 'mst-412', name: 'MST 412', floor: 4, kind: 'classroom', rect: rect(33.5, 76.0, 6.6, 12.3), nodeId: 'f4-center-bottom' },
  { id: 'mst-411', name: 'MST 411', floor: 4, kind: 'classroom', rect: rect(40.0, 76.0, 6.6, 12.3), nodeId: 'f4-center-bottom' },
  { id: 'mst-410', name: 'MST 410', floor: 4, kind: 'classroom', rect: rect(53.0, 76.0, 6.6, 12.3), nodeId: 'f4-right-bottom' },
  { id: 'mst-408', name: 'MST 408', floor: 4, kind: 'classroom', rect: rect(66.1, 76.0, 6.6, 12.3), nodeId: 'f4-right-bottom' },
  { id: 'mst-407', name: 'MST 407', floor: 4, kind: 'classroom', rect: rect(72.7, 76.0, 6.6, 12.3), nodeId: 'f4-right-bottom' },
  { id: 'mst-406', name: 'MST 406', floor: 4, kind: 'classroom', rect: rect(79.3, 76.0, 6.6, 12.3), nodeId: 'f4-right-bottom' },
  { id: 'mst-405', name: 'MST 405', floor: 4, kind: 'classroom', rect: rect(89.9, 76.0, 6.6, 12.3), nodeId: 'f4-right-bottom' },
  { id: 'mst-401', name: 'MST 401', floor: 4, kind: 'classroom', rect: rect(91.0, 28.5, 6.6, 10.2), nodeId: 'f4-right-top' },
  { id: 'mst-402', name: 'MST 402', floor: 4, kind: 'classroom', rect: rect(91.0, 38.0, 6.6, 12.3), nodeId: 'f4-right-top' },
  { id: 'mst-403', name: 'MST 403', floor: 4, kind: 'classroom', rect: rect(91.0, 50.3, 6.6, 12.3), nodeId: 'f4-right-top' },
  { id: 'mst-404', name: 'MST 404', floor: 4, kind: 'classroom', rect: rect(91.0, 62.6, 6.6, 12.3), nodeId: 'f4-right-top' },
  { id: 'mst-405', name: 'MST 405', floor: 4, kind: 'classroom', rect: rect(92.0, 75.0, 6.0, 12.3), nodeId: 'f4-right-bottom' },
]

export const INDOOR_ROOMS: IndoorRoom[] = [
  ...FLOOR1_ROOMS,
  ...FLOOR2_ROOMS,
  ...FLOOR3_ROOMS,
  ...FLOOR4_ROOMS,
]


const HALL_Y_TOP = 40
const HALL_Y_BOTTOM = 60.5
const HALL_X_LEFT = 17.5
const HALL_X_MID = 46.5
const HALL_X_RIGHT = 86.5

type HallNode = { id: string; floor: number; image: Point2D }

const HALLWAY_NODES: HallNode[] = [
  // Floor 1
  { id: 'f1-left-top', floor: 1, image: { x: HALL_X_LEFT, y: HALL_Y_TOP } },
  { id: 'f1-left-bottom', floor: 1, image: { x: HALL_X_LEFT, y: HALL_Y_BOTTOM } },
  { id: 'f1-mid-bottom', floor: 1, image: { x: HALL_X_MID, y: HALL_Y_BOTTOM } },
  { id: 'f1-center-bottom', floor: 1, image: { x: HALL_X_MID, y: HALL_Y_BOTTOM + 4 } },
  { id: 'f1-right-bottom', floor: 1, image: { x: HALL_X_RIGHT, y: HALL_Y_BOTTOM } },
  { id: 'f1-right-top', floor: 1, image: { x: HALL_X_RIGHT, y: HALL_Y_TOP } },
  // Floor 2
  { id: 'f2-left-top', floor: 2, image: { x: HALL_X_LEFT, y: HALL_Y_TOP } },
  { id: 'f2-left-bottom', floor: 2, image: { x: HALL_X_LEFT, y: HALL_Y_BOTTOM } },
  { id: 'f2-mid-bottom', floor: 2, image: { x: HALL_X_MID, y: HALL_Y_BOTTOM } },
  { id: 'f2-center-bottom', floor: 2, image: { x: HALL_X_MID, y: HALL_Y_BOTTOM + 4 } },
  { id: 'f2-right-bottom', floor: 2, image: { x: HALL_X_RIGHT, y: HALL_Y_BOTTOM } },
  { id: 'f2-right-top', floor: 2, image: { x: HALL_X_RIGHT, y: HALL_Y_TOP } },
  // Floor 3
  { id: 'f3-left-top', floor: 3, image: { x: HALL_X_LEFT, y: HALL_Y_TOP } },
  { id: 'f3-left-bottom', floor: 3, image: { x: HALL_X_LEFT, y: HALL_Y_BOTTOM } },
  { id: 'f3-mid-bottom', floor: 3, image: { x: HALL_X_MID, y: HALL_Y_BOTTOM } },
  { id: 'f3-center-bottom', floor: 3, image: { x: HALL_X_MID, y: HALL_Y_BOTTOM + 4 } },
  { id: 'f3-right-bottom', floor: 3, image: { x: HALL_X_RIGHT, y: HALL_Y_BOTTOM } },
  { id: 'f3-right-top', floor: 3, image: { x: HALL_X_RIGHT, y: HALL_Y_TOP } },
  // Floor 4
  { id: 'f4-left-top', floor: 4, image: { x: HALL_X_LEFT, y: HALL_Y_TOP } },
  { id: 'f4-left-bottom', floor: 4, image: { x: HALL_X_LEFT, y: HALL_Y_BOTTOM } },
  { id: 'f4-mid-bottom', floor: 4, image: { x: HALL_X_MID, y: HALL_Y_BOTTOM } },
  { id: 'f4-center-bottom', floor: 4, image: { x: HALL_X_MID, y: HALL_Y_BOTTOM + 4 } },
  { id: 'f4-right-bottom', floor: 4, image: { x: HALL_X_RIGHT, y: HALL_Y_BOTTOM } },
  { id: 'f4-right-top', floor: 4, image: { x: HALL_X_RIGHT, y: HALL_Y_TOP } },
]

/** All hallway node ids (exported for data-integrity checks). */
export const HALLWAY_NODE_IDS = new Set<string>(HALLWAY_NODES.map((node) => node.id))

/* ── Entrance / exit / stairs markers per floor ───────────────────────────── */

const MAIN_ENTRANCE = { x: 49.0, y: 79.0 }
const MAIN_EXIT = { x: 52.8, y: 79.0 }
const STAIRS_LEFT = { x: 15.0, y: 57.0 }
const STAIRS_RIGHT = { x: 89.0, y: 57.0 }

export const INDOOR_MARKERS: IndoorMarker[] = [
  { id: 'f1-entrance', floor: 1, kind: 'entrance', label: 'Main entrance', image: MAIN_ENTRANCE, color: MARKER_COLORS.entrance },
  { id: 'f1-exit', floor: 1, kind: 'exit', label: 'Exit', image: MAIN_EXIT, color: MARKER_COLORS.exit },
  { id: 'f1-stairs-left', floor: 1, kind: 'stairs', label: 'Stairs (left wing)', image: STAIRS_LEFT, color: MARKER_COLORS.stairs },
  { id: 'f1-stairs-right', floor: 1, kind: 'stairs', label: 'Stairs (right wing)', image: STAIRS_RIGHT, color: MARKER_COLORS.stairs },
  ...[2, 3, 4].flatMap((floor): IndoorMarker[] => [
    { id: `f${floor}-entrance`, floor, kind: 'entrance', label: 'Stair landing entrance', image: MAIN_ENTRANCE, color: MARKER_COLORS.entrance },
    { id: `f${floor}-exit`, floor, kind: 'exit', label: 'Stair landing exit', image: MAIN_EXIT, color: MARKER_COLORS.exit },
    { id: `f${floor}-stairs-left`, floor, kind: 'stairs', label: 'Stairs (left wing)', image: STAIRS_LEFT, color: MARKER_COLORS.stairs },
    { id: `f${floor}-stairs-right`, floor, kind: 'stairs', label: 'Stairs (right wing)', image: STAIRS_RIGHT, color: MARKER_COLORS.stairs },
  ]),
]

/** Climbing stairs costs like walking ~1.6× the horizontal distance. */
const STAIR_PENALTY = 12

const STAIR_LINKS: { a: string; b: string; wing: 'left' | 'right' }[] = [
  { a: 'f1-left-top', b: 'f2-left-top', wing: 'left' },
  { a: 'f2-left-top', b: 'f3-left-top', wing: 'left' },
  { a: 'f3-left-top', b: 'f4-left-top', wing: 'left' },
  { a: 'f1-right-top', b: 'f2-right-top', wing: 'right' },
  { a: 'f2-right-top', b: 'f3-right-top', wing: 'right' },
  { a: 'f3-right-top', b: 'f4-right-top', wing: 'right' },
]

/* ── Graph construction ───────────────────────────────────────────────────── */

const floorGraphs = new Map<number, Graph>()
for (let floor = 1; floor <= 4; floor++) {
  const graph = createGraph()
  const f = (suffix: string) => `f${floor}-${suffix}`
  const imageOf = (id: string) => HALLWAY_NODES.find((node) => node.id === id)!.image
  const distance = (a: string, b: string) => Math.hypot(imageOf(b).x - imageOf(a).x, imageOf(b).y - imageOf(a).y)
  // U-shaped hallway: left wing down, bottom wing across (via center), right wing up.
  addEdge(graph, f('left-top'), f('left-bottom'), distance(f('left-top'), f('left-bottom')))
  addEdge(graph, f('left-bottom'), f('mid-bottom'), distance(f('left-bottom'), f('mid-bottom')))
  addEdge(graph, f('mid-bottom'), f('center-bottom'), distance(f('mid-bottom'), f('center-bottom')))
  addEdge(graph, f('mid-bottom'), f('right-bottom'), distance(f('mid-bottom'), f('right-bottom')))
  addEdge(graph, f('right-bottom'), f('right-top'), distance(f('right-bottom'), f('right-top')))
  floorGraphs.set(floor, graph)
}

/** Combined multi-floor graph including stairs links. */
const fullGraph = createGraph()
for (const graph of floorGraphs.values()) {
  for (const [id, edges] of graph) {
    for (const edge of edges) {
      addEdge(fullGraph, id, edge.to, edge.distance)
    }
  }
}
for (const link of STAIR_LINKS) {
  addEdge(fullGraph, link.a, link.b, STAIR_PENALTY)
}

/* ── Indoor routing ───────────────────────────────────────────────────────── */

export type IndoorRouteSegment = {
  floor: number
  points: Point2D[]
}

export type IndoorRouteStep = {
  action: 'depart' | 'straight' | 'left' | 'right' | 'stairs-up' | 'stairs-down' | 'arrive'
  instruction: string
  floor: number
}

export type IndoorRoute = {
  fromRoom: IndoorRoom | null
  toRoom: IndoorRoom
  segments: IndoorRouteSegment[]
  steps: IndoorRouteStep[]
  totalDistance: number
  floorsVisited: number[]
}

const nodeFloor = (id: string) => Number(id.slice(1, id.indexOf('-')))
const nodeImage = (id: string) => HALLWAY_NODES.find((node) => node.id === id)!.image

/** Route between two rooms anywhere in the building (stairs included). */
export function findIndoorRoute(fromRoomId: string | null, toRoomId: string): IndoorRoute | null {
  const toRoom = INDOOR_ROOMS.find((room) => room.id === toRoomId)
  if (!toRoom) return null
  const fromRoom = fromRoomId ? INDOOR_ROOMS.find((room) => room.id === fromRoomId) ?? null : null
  // Walks always start at the floor-1 main entrance area of the hallway.
  const path = shortestPath(fullGraph, fromRoom ? fromRoom.nodeId : entranceNodeForFloor(1), toRoom.nodeId)
  if (!path) return null

  const roomCenter = (room: IndoorRoom): Point2D => ({
    x: room.rect.x + room.rect.w / 2,
    y: room.rect.y + room.rect.h / 2,
  })

  // Split the path into per-floor segments.
  const segments: IndoorRouteSegment[] = []
  const steps: IndoorRouteStep[] = []
  let currentFloor = nodeFloor(path.nodeIds[0])
  let currentPoints: Point2D[] = fromRoom
    ? [roomCenter(fromRoom), nodeImage(path.nodeIds[0])]
    : [nodeImage(path.nodeIds[0])]
  const floorsVisited = new Set<number>([currentFloor])

  steps.push({ action: 'depart', instruction: fromRoom ? `Leave ${fromRoom.name} — enter the hallway` : 'Enter the building through the main entrance', floor: currentFloor })

  for (let i = 1; i < path.nodeIds.length; i++) {
    const id = path.nodeIds[i]
    const floor = nodeFloor(id)
    if (floor !== currentFloor) {
      segments.push({ floor: currentFloor, points: currentPoints })
      const going = floor > currentFloor ? 'stairs-up' : 'stairs-down'
      steps.push({ action: going, instruction: `Take the stairs to floor ${floor}`, floor: currentFloor })
      currentFloor = floor
      floorsVisited.add(floor)
      // Stair nodes share percent coords across floors — start from the landing only.
      currentPoints = [nodeImage(id)]
    } else {
      currentPoints.push(nodeImage(id))
    }
  }
  currentPoints.push(roomCenter(toRoom))
  segments.push({ floor: currentFloor, points: currentPoints })
  steps.push({ action: 'arrive', instruction: `Arrive at ${toRoom.name}`, floor: toRoom.floor })

  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1]
    if (lastSegment.points.length >= 3) {
      steps.splice(steps.length - 1, 0, {
        action: 'straight',
        instruction: `Walk along the hallway on floor ${lastSegment.floor}`,
        floor: lastSegment.floor,
      })
    }
  }

  return {
    fromRoom,
    toRoom,
    segments,
    steps,
    totalDistance: path.totalDistance,
    floorsVisited: [...floorsVisited].sort((a, b) => a - b),
  }
}

function entranceNodeForFloor(floor: number): string {
  return `f${floor}-center-bottom`
}


export function searchIndoorRooms(query: string, limit = 12): IndoorRoom[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return INDOOR_ROOMS.filter((room) => room.name.toLowerCase().includes(needle)).slice(0, limit)
}

export function findIndoorRoom(roomId: string): IndoorRoom | undefined {
  return INDOOR_ROOMS.find((room) => room.id === roomId)
}

export function roomsOnFloor(floor: number): IndoorRoom[] {
  return INDOOR_ROOMS.filter((room) => room.floor === floor)
}

export const INDOOR_BUILDING = {
  id: 'mst-building',
  name: 'MST Building',
  floors: [1, 2, 3, 4],
  blueprintAspect: CAMPUS_IMAGE_ASPECT,
  blueprint: (_floor: number) => '/campus-aerial.jpg.png',
}
