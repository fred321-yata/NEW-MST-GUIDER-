import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  INDOOR_BUILDING,
  INDOOR_MARKERS,
  INDOOR_ROOMS,
  findIndoorRoute,
  roomsOnFloor,
} from './campus/indoor'
import type { IndoorRoom, RoomKind } from './campus/indoor'

const ROOM_COLORS: Record<RoomKind, string> = {
  classroom: '#2e6b5e',
  office: '#7a5df0',
  clinic: '#e0559a',
  library: '#c9930a',
  lab: '#0f7f9e',
  'comfort-room': '#d912a0',
}

type Props = {
  initialRoomId?: string | null
  onClose: () => void
}

type PanoramaPoint = {
  id: string
  floor: number
  x: number
  y: number
}

const DEFAULT_PANORAMA_POINTS: PanoramaPoint[] = [
  { id: 'capture-01', floor: 1, x: 18.2, y: 27 },
  { id: 'capture-02', floor: 1, x: 17.7, y: 33 },
  { id: 'capture-03', floor: 1, x: 17.1, y: 39 },
  { id: 'capture-04', floor: 1, x: 16.5, y: 45 },
  { id: 'capture-05', floor: 1, x: 15.7, y: 52 },
  { id: 'capture-06', floor: 1, x: 14.9, y: 59 },
  { id: 'capture-07', floor: 1, x: 14.2, y: 66 },
  { id: 'capture-08', floor: 1, x: 14, y: 78 },
  { id: 'capture-09', floor: 1, x: 22, y: 78 },
  { id: 'capture-10', floor: 1, x: 30, y: 78 },
  { id: 'capture-11', floor: 1, x: 38, y: 78 },
  { id: 'capture-12', floor: 1, x: 47, y: 78 },
  { id: 'capture-13', floor: 1, x: 55, y: 78 },
  { id: 'capture-14', floor: 1, x: 63, y: 78 },
  { id: 'capture-15', floor: 1, x: 71, y: 78 },
  { id: 'capture-16', floor: 1, x: 79, y: 78 },
  { id: 'capture-17', floor: 1, x: 87, y: 78 },
  { id: 'capture-18', floor: 1, x: 96, y: 78 },
]

for (const floor of [2, 3, 4]) {
  for (const point of DEFAULT_PANORAMA_POINTS.filter((item) => item.floor === 1)) {
    DEFAULT_PANORAMA_POINTS.push({ ...point, id: `floor-${floor}-${point.id}`, floor })
  }
}

const panoramaFilename = (pointId: string) => PANORAMA_FILES[pointId] ?? `${pointId}.jpg`

const PANORAMA_FILES: Record<string, string | undefined> = {
  'capture-01': undefined,
  'capture-02': undefined,
  'capture-03': undefined,
  'capture-04': 'indoor-panoscapture-04.jpg.jpg',
  'capture-05': 'indoor-panoscapture-05.pg.jpg',
  'capture-06': 'indoor-panoscapture-06.jpg.jpg',
  'capture-07': undefined,
  'capture-08': 'indoor-panoscapture-08.jpg.jpg',
  'capture-09': 'indoor-panoscapture-09.jpg.jpg',
  'capture-10': 'indoor-panoscapture-10.jpg.jpg',
  'capture-11': undefined,
  'capture-12': 'indoor-panoscapture-12.jpg.jpg',
  'capture-13': 'indoor-panoscapture-13.jpg.jpg',
  'capture-14': 'indoor-panoscapture-14.jpg.jpg',
  'capture-15': 'indoor-panoscapture-15.jpg.jpg',
  'capture-16': 'indoor-panoscapture-16.jpg.jpg',
  'capture-17': 'indoor-panoscapture-17.jpg.jpg',
  'capture-18': 'indoor-panoscapture-18.jpg.jpg',
}

for (const floor of [2, 3, 4]) {
  for (let index = 1; index <= 18; index += 1) {
    const pointId = `floor-${floor}-capture-${String(index).padStart(2, '0')}`
    PANORAMA_FILES[pointId] = floor === 2
      ? `floor-2-capture-${String(index).padStart(2, '0')}.jpg.jpg`
      : floor === 3 && index <= 16
        ? `floor-3-capture-${String(index).padStart(2, '0')}.jpg.jpg`
      : floor === 4 && index <= 15
        ? `floor-4-capture-${String(index).padStart(2, '0')}.jpg.jpg.jpg`
      : undefined
  }
}

const FINAL_PANORAMA_POSITIONS: Record<string, { x: number; y: number }> = Object.fromEntries(
  [
    [1, [[31.6202, 18.6244], [31.2718, 32.9143], [38.4146, 35.3995], [57.0557, 73.6094], [13.1533, 69.2603], [42.5958, 73.2987], [41.3763, 29.4971], [12.2822, 47.5148], [70.2962, 72.3668], [12.2822, 36.9527], [45.3833, 19.8670], [88.4146, 35.7101], [24.4774, 73.6094], [87.0209, 70.8135], [64.1986, 73.2987], [88.7631, 60.8727], [88.5888, 48.7574], [79.7038, 72.0561]]],
    [2, [[12.1080, 36.6421], [12.1080, 48.7574], [12.6307, 61.4940], [14.0244, 72.0561], [20.4704, 73.6094], [26.7422, 73.2987], [33.0139, 73.2987], [38.7631, 73.2987], [44.5122, 73.2987], [54.9652, 72.9881], [61.5854, 72.3668], [68.0314, 72.3668], [75.3484, 72.6774], [81.7944, 72.9881], [86.8467, 71.1242], [88.7631, 59.6301], [87.8920, 47.5148], [88.2404, 36.6421]]],
    [3, [[11.5854, 36.0208], [12.2822, 47.5148], [11.9338, 59.6301], [13.8502, 72.9881], [22.0383, 72.6774], [29.7038, 72.3668], [36.8467, 71.7455], [42.0732, 72.3668], [56.5331, 72.6774], [63.8502, 72.9881], [69.4251, 72.9881], [75.5226, 72.9881], [85.9756, 70.8135], [87.3693, 59.3195], [87.7178, 49.0681], [87.5435, 36.0208], [37.3693, 42.8551], [39.1115, 26.7013]]],
    [4, [[12.1080, 47.8254], [12.8049, 69.2603], [23.4321, 73.2987], [30.7491, 72.0561], [36.8467, 72.0561], [42.9443, 73.6094], [56.0105, 73.9200], [62.8049, 73.2987], [69.2509, 72.6774], [75.5226, 72.0561], [81.6202, 72.6774], [85.8014, 68.9496], [88.2404, 59.6301], [88.4146, 47.5148], [88.2404, 36.6421], [42.7700, 22.6628], [30.9233, 30.1184], [70.1220, 31.6717]]],
  ].flatMap(([floor, positions]) =>
    (positions as number[][]).map(([x, y], index) => [
      Number(floor) === 1 ? `capture-${String(index + 1).padStart(2, '0')}` : `floor-${floor}-capture-${String(index + 1).padStart(2, '0')}`,
      { x, y },
    ]),
  ),
)

const HIDDEN_PANORAMA_IDS = new Set([
  'capture-01', 'capture-02', 'capture-03', 'capture-07', 'capture-11',
  'floor-3-capture-17', 'floor-3-capture-18',
  'floor-4-capture-16', 'floor-4-capture-17', 'floor-4-capture-18',
])

export function IndoorNavigator({ initialRoomId = null, onClose }: Props) {
  const [floor, setFloor] = useState(initialRoomId ? INDOOR_ROOMS.find((room) => room.id === initialRoomId)?.floor ?? 1 : 1)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId)
  const [destinationId, setDestinationId] = useState<string | null>(null)
  const blueprintRef = useRef<HTMLDivElement | null>(null)
  const [blueprintZoom, setBlueprintZoom] = useState(1)
  const [blueprintOffset, setBlueprintOffset] = useState({ x: 0, y: 0 })
  const blueprintDragRef = useRef({ active: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 })
  const panoramaPoints = DEFAULT_PANORAMA_POINTS
    .map((point) => ({ ...point, ...FINAL_PANORAMA_POSITIONS[point.id] }))
    .filter((point) => !HIDDEN_PANORAMA_IDS.has(point.id))

  const selectedRoom = selectedRoomId ? INDOOR_ROOMS.find((room) => room.id === selectedRoomId) ?? null : null
  const destinationRoom = destinationId ? INDOOR_ROOMS.find((room) => room.id === destinationId) ?? null : null
  const route = useMemo(
    () => (destinationRoom ? findIndoorRoute(selectedRoom?.id ?? null, destinationRoom.id) : null),
    [selectedRoom, destinationRoom],
  )

  const selectRoom = (room: IndoorRoom) => {
    setSelectedRoomId(room.id)
    setFloor(room.floor)
  }

  const changeBlueprintZoom = (amount: number) => {
    setBlueprintZoom((current) => {
      const next = Math.min(3, Math.max(1, current + amount))
      if (next === 1) setBlueprintOffset({ x: 0, y: 0 })
      return next
    })
  }

  const startBlueprintDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (blueprintZoom === 1 || (event.target as HTMLElement).closest('button')) return
    const offset = blueprintOffset
    blueprintDragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveBlueprintDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!blueprintDragRef.current.active) return
    const { startX, startY, startOffsetX, startOffsetY } = blueprintDragRef.current
    setBlueprintOffset({
      x: startOffsetX + event.clientX - startX,
      y: startOffsetY + event.clientY - startY,
    })
  }

  const stopBlueprintDrag = () => {
    blueprintDragRef.current.active = false
  }

  const routeFloorPoints = (targetFloor: number) =>
    route?.segments.filter((segment) => segment.floor === targetFloor).flatMap((segment) => segment.points) ?? []

  const percent = (value: number) => `${value}%`

  // Indoor panorama viewer state
  const [openPanorama, setOpenPanorama] = useState<string | null>(null)
  const [pendingPanorama, setPendingPanorama] = useState<string | null>(null)
  const [failedPanorama, setFailedPanorama] = useState(false)
  const sphereRef = useRef<HTMLDivElement | null>(null)
  const [lastClickedPanorama, setLastClickedPanorama] = useState<PanoramaPoint | null>(null)

  const closePanorama = () => {
    if (openPanorama) {
      const found = panoramaPoints.find((p) => p.id === openPanorama) ?? null
      if (found) setLastClickedPanorama(found)
    }
    setOpenPanorama(null)
    setPendingPanorama(null)
    setFailedPanorama(false)
  }

  useEffect(() => {
    if (!openPanorama || !sphereRef.current) return
    setFailedPanorama(false)
    const container = sphereRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100)

    // Close on Escape for convenience
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanorama() }
    window.addEventListener('keydown', onKey)
    camera.position.set(0, 0, 0.01)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(40, 64, 40),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide }),
    )
    scene.add(sphere)
    const textureLoader = new THREE.TextureLoader()
    const filename = PANORAMA_FILES[openPanorama] ?? `${openPanorama}.jpg`
    const imagePath = `/indoor-panos/${encodeURIComponent(filename)}`
    textureLoader.load(
      imagePath,
      (texture) => {
        // Some environments expose SRGBColorSpace on THREE
        try { (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (texture as any).colorSpace } catch {}
        texture.wrapS = THREE.RepeatWrapping
        texture.repeat.x = -1
        texture.offset.x = 1
        sphere.material.map = texture
        sphere.material.needsUpdate = true
      },
      undefined,
      (err) => { console.error('Failed to load panorama', imagePath, err); setFailedPanorama(true) },
    )

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.enableDamping = true
    controls.rotateSpeed = -0.25
    controls.minPolarAngle = 0.08
    controls.maxPolarAngle = Math.PI - 0.08

    const resize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    let animationFrame = 0
    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('keydown', onKey)
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.dispose()
      sphere.geometry.dispose()
      sphere.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [openPanorama])


  return (
    <section className="indoor-overlay" aria-label="MST building indoor navigator">
      <header className="indoor-header">
        <button className="viewer-close" onClick={onClose} aria-label="Close indoor navigator">×</button>
        <div>
          <p className="eyebrow">Discover MST Hallway</p>
          <h2>{INDOOR_BUILDING.name} · {INDOOR_ROOMS.length} rooms</h2>
        </div>
        <div className="floor-tabs" role="tablist" aria-label="Floor selection">
          {INDOOR_BUILDING.floors.map((level) => (
            <button
              key={level}
              role="tab"
              aria-selected={floor === level}
              className={floor === level ? 'floor-tab active' : 'floor-tab'}
              onClick={() => setFloor(level)}
            >
              {level}F
            </button>
          ))}
        </div>
      </header>

      <div className="indoor-body">
        <div className="indoor-map-pane">
          <div
            ref={blueprintRef}
            className="indoor-blueprint"
            style={{ aspectRatio: `${INDOOR_BUILDING.blueprintAspect}` }}
            onPointerDown={startBlueprintDrag}
            onPointerMove={moveBlueprintDrag}
            onPointerUp={stopBlueprintDrag}
            onPointerCancel={stopBlueprintDrag}
            onPointerLeave={stopBlueprintDrag}>

            <div
              className="indoor-blueprint-content"
              style={{ transform: `translate(${blueprintOffset.x}px, ${blueprintOffset.y}px) scale(${blueprintZoom})` }}
            >
            <img className="indoor-blueprint-image" src="/campus-aerial.jpg.png" alt="" aria-hidden="true" />
            <svg className="indoor-overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {routeFloorPoints(floor).length > 1 && (
                <polyline
                  className="indoor-route-line"
                  points={routeFloorPoints(floor).map((point) => `${point.x},${point.y}`).join(' ')}
                />
              )}
            </svg>
            {panoramaPoints.filter((point) => point.floor === floor).map((point) => {
              const hasPanorama = Boolean(PANORAMA_FILES[point.id])
              const pointNumber = point.id.match(/capture-(\d+)$/)?.[1] ?? '?'
              return (
              <button
                key={point.id}
                type="button"
                className={`indoor-pano-marker ${hasPanorama ? 'available' : 'pending'}`}
                style={{ left: percent(point.x), top: percent(point.y) }}
                aria-label={hasPanorama ? `Open 360 view for ${point.id}` : `${point.id} 360 image pending`}
                title={hasPanorama ? `Open 360 view for ${point.id}` : `${point.id} 360 image pending`}
                onClick={() => {
                  if (hasPanorama) {
                    setPendingPanorama(null)
                    setOpenPanorama(point.id)
                  } else {
                    setOpenPanorama(null)
                    setPendingPanorama(point.id)
                  }
                }}
              >
                <span className="indoor-pano-marker-core" />
                <span className="indoor-pano-marker-number" aria-hidden="true">{pointNumber}</span>
              </button>
              )
            })}
            {roomsOnFloor(floor).map((room) => {
              const isSelected = room.id === selectedRoomId
              const isDestination = room.id === destinationId
              return (
                <button
                  key={room.id}
                  type="button"
                  className={
                    'indoor-room' +
                    (isSelected ? ' selected' : '') +
                    (isDestination ? ' destination' : '')
                  }
                  style={{
                    left: percent(room.rect.x),
                    top: percent(room.rect.y),
                    width: percent(room.rect.w),
                    height: percent(room.rect.h),
                    '--room-label-size': room.name.length > 20 ? 'clamp(4px, .72cqw, 7px)' : room.name.length > 12 ? 'clamp(4.5px, .9cqw, 8px)' : 'clamp(5px, 1.25cqw, 10px)',
                    '--room-color': ROOM_COLORS[room.kind],
                  } as React.CSSProperties}
                  onClick={() => selectRoom(room)}
                  title={room.name}
                  aria-label={`${room.name}, floor ${room.floor}`}
                >
                  <span>{room.name}</span>
                </button>
              )
            })}
            {selectedRoom && selectedRoom.floor === floor && (
              <div
                className="indoor-room-target"
                style={{
                  left: percent(selectedRoom.rect.x + selectedRoom.rect.w / 2),
                  top: percent(selectedRoom.rect.y + selectedRoom.rect.h / 2),
                }}
                aria-label={`Selected room: ${selectedRoom.name}`}
                title={`Selected room: ${selectedRoom.name}`}
              >
                <span className="indoor-room-target-ring" />
              </div>
            )}
            {INDOOR_MARKERS.filter((marker) => marker.floor === floor && marker.kind !== 'stairs').map((marker) => (
              <span
                key={marker.id}
                className={`indoor-marker marker-${marker.kind}`}
                style={{ left: percent(marker.image.x), top: percent(marker.image.y), background: marker.color }}
                title={marker.label}
                aria-label={marker.label}
              />
            ))}

            {/* Return target indicator placed where user clicked before opening panorama */}
            {lastClickedPanorama && lastClickedPanorama.floor === floor && (
              <div
                className="indoor-pano-return-target"
                style={{ left: percent(lastClickedPanorama.x), top: percent(lastClickedPanorama.y) }}
                aria-hidden="true"
                title={`Last opened: ${lastClickedPanorama.id}`}
              >
                <span />
              </div>
            )}
            </div>
            {(openPanorama || pendingPanorama) && (
              <div className="indoor-pano-modal" role="dialog" aria-label="Indoor 360 viewer">
                <div className="indoor-pano-topbar">
                  <strong>{openPanorama ?? pendingPanorama}</strong>
                  <div>
                    <button onClick={closePanorama} className="indoor-pano-back">← Back to blueprint</button>
                  </div>
                </div>
                <div className="indoor-pano-content">
                  {pendingPanorama ? (
                    <div className="indoor-pano-missing">
                      <strong>360 image pending</strong>
                      <p>No image has been added for {pendingPanorama} yet.</p>
                      <p>Add <code>/public/indoor-panos/{panoramaFilename(pendingPanorama)}</code>, then reload the app.</p>
                    </div>
                  ) : failedPanorama ? (
                    <div className="indoor-pano-missing">360 image could not be loaded for {openPanorama}. Check the matching file in <code>/public/indoor-panos/</code>.</div>
                  ) : (
                    <div ref={sphereRef} className="indoor-pano-sphere" aria-label="360 panorama" />
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="indoor-zoom-controls" aria-label="Blueprint zoom controls">
            <button type="button" onClick={() => changeBlueprintZoom(0.25)} aria-label="Zoom in">+</button>
            <button type="button" onClick={() => changeBlueprintZoom(-0.25)} aria-label="Zoom out">−</button>
          </div>
          <div className="indoor-legend">
            <span><i style={{ background: MARKER_LEGEND.entrance }} /> Entrance</span>
            <span><i style={{ background: MARKER_LEGEND.exit }} /> Exit</span>
            <span><i style={{ background: MARKER_LEGEND.hallway }} /> Hallway</span>
          </div>
        </div>

      </div>
    </section>
  )
}

const MARKER_LEGEND = {
  entrance: '#2b6ce6',
  exit: '#e02b2b',
  hallway: '#1f9d3a',
  stairs: '#7a5df0',
}
