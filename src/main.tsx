import { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './styles.css'
import { CAMPUS_IMAGE_ASPECT } from './campus/geo'
import type { Point2D } from './campus/geo'
import { CAMPUS_NODES, CAMPUS_PLACES, STREET_VIEW_POINTS, searchCampus } from './campus/model'
import type { SearchHit } from './campus/model'
import { findIndoorRoute, INDOOR_BUILDING, INDOOR_ROOMS } from './campus/indoor'
import { IndoorNavigator, nearestIndoorPanoramaId } from './IndoorNavigator'

type Screen = 'map' | 'search' | 'direction'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(1)
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = window.localStorage.getItem('school-guider-theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })
  const [screen, setScreen] = useState<Screen>('map')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedHit, setSelectedHit] = useState<SearchHit | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [viewerPoint, setViewerPoint] = useState<number | null>(null)
  const [viewerReturnScreen, setViewerReturnScreen] = useState<'map' | 'direction'>('map')
  const [indoorRoomId, setIndoorRoomId] = useState<string | null>(null)
  const [indoorPanoramaId, setIndoorPanoramaId] = useState<string | null>(null)
  const [isIndoorOpen, setIsIndoorOpen] = useState(false)
  const [infoModal, setInfoModal] = useState<'about' | 'contact' | null>(null)

  const openInfoModal = (modal: 'about' | 'contact') => {
    setInfoModal(modal)
    setIsSecondaryMenuOpen(false)
  }

  useEffect(() => {
    if (!infoModal) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInfoModal(null)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [infoModal])

  useEffect(() => {
    const start = Date.now()
    const duration = 3000
    const tick = () => {
      const elapsed = Date.now() - start
      const current = Math.max(1, Math.min(100, Math.floor((elapsed / duration) * 100)))
      setLoadingProgress(current)
      if (elapsed < duration) {
        requestAnimationFrame(tick)
      } else {
        setIsLoading(false)
      }
    }
    requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('school-guider-theme', theme)
  }, [theme])

  const openPlace = (hit: SearchHit) => {
    setSelectedHit(hit)
    setScreen('map')
  }

  const openSearchHit = (hit: SearchHit) => {
    if (hit.kind === 'place' && hit.place.id === 'mst-field') {
      open360Viewer(null)
      return
    }
    if (hit.kind === 'place' && hit.place.id === 'mst-building') {
      openIndoorNavigator(null)
      return
    }
    if (hit.kind === 'indoor') {
      openIndoorNavigator(hit.room.id)
      return
    }
    openPlace(hit)
  }

  const open360Viewer = (point: number | null, returnScreen: 'map' | 'direction' = 'map') => {
    setViewerPoint(point)
    setViewerReturnScreen(returnScreen)
    setScreen(returnScreen)
    setIsViewerOpen(true)
  }

  const openIndoorNavigator = (roomId: string | null, panoramaId: string | null = null) => {
    setIndoorRoomId(roomId)
    setIndoorPanoramaId(panoramaId)
    setIsIndoorOpen(true)
  }

  if (isLoading) return <LoadingScreen progress={loadingProgress} />

  return (
    <main className="app-shell">
      <header className={`topbar${isSecondaryMenuOpen ? ' secondary-menu-open' : ''}`}>
        <div className="brand-mark" aria-label="SEAIT logo"><span>SEAIT</span><img src="/publicseait-logo.png.jpg" alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} /></div>
        <div className="topbar-copy">
          <p className="eyebrow">SEAIT CAMPUS GUIDE</p>
          <h1>SEAIT (SOUTH EAST ASIA INSTITUTE OF TECHNOLOGY)</h1>
        </div>
        <button
          className="menu-toggle"
          type="button"
          aria-label={isSecondaryMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isSecondaryMenuOpen}
          aria-controls="secondary-navigation"
          onClick={() => setIsSecondaryMenuOpen((isOpen) => !isOpen)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="secondary-navigation" className="topbar-nav" aria-label="Secondary navigation" aria-hidden={!isSecondaryMenuOpen}>
          <a href="#about-us" tabIndex={isSecondaryMenuOpen ? 0 : -1} onClick={(event) => { event.preventDefault(); openInfoModal('about') }}>About us</a>
          <a href="#contact" tabIndex={isSecondaryMenuOpen ? 0 : -1} onClick={(event) => { event.preventDefault(); openInfoModal('contact') }}>Contact</a>
        </nav>
      </header>

      {!isIndoorOpen && !isViewerOpen && (
        <div className="explore-search">
          <label className="explore-search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Explore campus"
              placeholder="Explore buildings, areas, or rooms"
              value={searchQuery}
              onFocus={() => setScreen('search')}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setScreen('search')
              }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">×</button>
            )}
          </label>
        </div>
      )}

      <section id="map" className="content" aria-live="polite">
        {screen === 'search' && (
          <SearchScreen
            onBack={() => setScreen('map')}
            onSelectPlace={openSearchHit}
            onOpenIndoor={(roomId) => openIndoorNavigator(roomId)}
            query={searchQuery}
          />
        )}

        {screen === 'direction' && (
          <DirectionScreen onOpenRoom={openIndoorNavigator} onOpenCampusPoint={open360Viewer} />
        )}

        {screen === 'map' && (
          <>
            <div className="dashboard-layout">
              <section className="aerial-view-card panel-enter" aria-label="SEAIT aerial view">
                <div className="front-view-heading"><div><p className="eyebrow">CAMPUS VIEW</p><h2>Top view</h2></div></div>
                <div className="map-card">
                  <CampusMapCanvas
                    onPlaceMarker={(placeId) => {
                      const place = CAMPUS_PLACES.find((candidate) => candidate.id === placeId)
                      if (place) openPlace({ kind: 'place', place })
                    }}
                  />
                </div>
              </section>
            </div>

            <section className="front-view-card panel-enter" aria-label="SEAIT front view">
              <div className="front-view-heading"><div><p className="eyebrow">CAMPUS VIEW</p><h2>Front view</h2></div></div>
              <img className="dashboard-front-image" src="/d5bdb47f-2c38-4f94-9830-01634591a7fc.png" alt="Front view of the SEAIT building" draggable={false} onDragStart={(event) => event.preventDefault()} />
            </section>

            <section className="section-heading">
              <div><p className="eyebrow">SELECTED AREA</p><h2>{selectedHit ? hitLabel(selectedHit) : 'MST Building'}</h2></div>
              <span className="verified-badge">{selectedHit?.kind === 'place' && selectedHit.place.status === 'pending' ? 'PENDING' : 'VERIFIED'}</span>
            </section>
            <PlaceDetailCard
              hit={selectedHit ?? { kind: 'place', place: CAMPUS_PLACES[0] }}
              onDirections={() => {
                setScreen('direction')
              }}
              onOpenIndoor={() => openIndoorNavigator(null)}
            />

          </>
        )}
      </section>

      {infoModal && (
        <div className="info-modal-backdrop" onClick={() => setInfoModal(null)}>
          <section
            className="info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="info-modal-banner">
              <button className="info-modal-close" type="button" aria-label="Close dialog" onClick={() => setInfoModal(null)}>×</button>
              <span className="info-modal-emblem" aria-hidden="true">{infoModal === 'about' ? '✦' : '✉'}</span>
              <p className="info-modal-eyebrow">{infoModal === 'about' ? 'ABOUT SEAIT GUIDER' : 'WE’RE HERE TO HELP'}</p>
              <h2 id="info-modal-title">
                {infoModal === 'about' ? 'Built for easier campus discovery.' : 'Need help or have a question?'}
              </h2>
            </div>
            <div className="info-modal-content">
              {infoModal === 'about' ? (
                <p>SEAIT Guider helps students and visitors quickly locate key buildings, pathways, and hallway rooms across the campus.</p>
              ) : (
                <>
                  <p>Get in touch with us if you need help finding your way around campus.</p>
                  <a href="mailto:freddieyata88@gmail.com"><span aria-hidden="true">✉</span> freddieyata88@gmail.com</a>
                  <a href="tel:+639306672483"><span aria-hidden="true">☎</span> +63 930 667 2483</a>
                </>
              )}
            </div>
            <div className="info-modal-footer">
              <span>SEAIT CAMPUS GUIDE</span>
              <button type="button" onClick={() => setInfoModal(null)}>Got it</button>
            </div>
          </section>
        </div>
      )}

      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={screen === 'map' && !isIndoorOpen && !isViewerOpen ? 'nav-item active' : 'nav-item'} onClick={() => { setIsIndoorOpen(false); setIsViewerOpen(false); setScreen('map') }}><span>⌖</span><small>Map</small></button>
        <button className={isIndoorOpen ? 'nav-item active' : 'nav-item'} type="button" onClick={() => { setIsViewerOpen(false); setScreen('map'); openIndoorNavigator(null) }} aria-label="Open MST building map"><span>⌂</span><small>MST BUILDING</small></button>
        <button className={isViewerOpen ? 'nav-item active' : 'nav-item'} type="button" onClick={() => { setIsIndoorOpen(false); setScreen('map'); open360Viewer(null) }} aria-label="Open campus 360 views"><span>◎</span><small>MST FIELD</small></button>
        <button className={screen === 'direction' ? 'nav-item active' : 'nav-item'} onClick={() => { setIsIndoorOpen(false); setIsViewerOpen(false); setScreen('direction') }}><span>↗</span><small>Direction</small></button>
      </nav>

      {isViewerOpen && (
        <CampusViewer
          initialPoint={viewerPoint}
          returnScreen={viewerReturnScreen}
          onClose={() => {
            setIsViewerOpen(false)
            setScreen(viewerReturnScreen)
          }}
        />
      )}
      {isIndoorOpen && <IndoorNavigator initialRoomId={indoorRoomId} initialPanoramaId={indoorPanoramaId} onClose={() => setIsIndoorOpen(false)} />}
    </main>
  )
}

function hitLabel(hit: SearchHit): string {
  if (hit.kind === 'place') return hit.place.name
  if (hit.kind === 'indoor') return `${hit.room.name} · MST Building`
  return `${hit.room.name} · ${hit.room.building}`
}

const nodePercentCache = new Map<string, Point2D>()
function nodeImagePercentCached(nodeId: string): Point2D {
  const cached = nodePercentCache.get(nodeId)
  if (cached) return cached
  const node = CAMPUS_NODES.find((candidate) => candidate.id === nodeId)
  const percent = node ? node.image : { x: 50, y: 50 }
  nodePercentCache.set(nodeId, percent)
  return percent
}

/** Renders the campus aerial photo and optional place markers. */
function CampusMapCanvas({
  showPlaceMarkers = false,
  onPlaceMarker,
}: {
  showPlaceMarkers?: boolean
  onPlaceMarker?: (placeId: string) => void
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = gridRef.current
    if (!element) return
    const measure = () => setFrame({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Match overlays to the full photo, including any empty space around it.
  const displayed = displayedImageRect(frame.width, frame.height, CAMPUS_IMAGE_ASPECT)

  return (
    <div ref={gridRef} className="map-grid" aria-label="Campus map">
      <img className="aerial-image" src="/campus-aerial.jpg.png" alt="Upper view of the SEAIT campus" draggable={false} onDragStart={(event) => event.preventDefault()} onError={(event) => { event.currentTarget.style.display = 'none' }} />
      {showPlaceMarkers &&
        CAMPUS_PLACES.map((place) => {
          const position = nodeImagePercentCached(place.nodeId)
          return (
            <button
              key={place.id}
              type="button"
              className="map-place-marker"
              style={{ left: `${displayed.left + (position.x / 100) * displayed.width}px`, top: `${displayed.top + (position.y / 100) * displayed.height}px` }}
              onClick={() => onPlaceMarker?.(place.id)}
              aria-label={`Show ${place.name}`}
            >
              {place.id === 'mst-building' ? 'MST' : 'FIELD'}
            </button>
          )
        })}
    </div>
  )
}

/** Displayed image rect when the full image is contained within the map frame. */
function displayedImageRect(width: number, height: number, aspect: number) {
  if (width <= 0 || height <= 0) return { left: 0, top: 0, width: 0, height: 0 }
  const containerAspect = width / height
  if (containerAspect > aspect) {
    const imageWidth = height * aspect
    return { left: (width - imageWidth) / 2, top: 0, width: imageWidth, height }
  }
  const imageHeight = width / aspect
  return { left: 0, top: (height - imageHeight) / 2, width, height: imageHeight }
}

function SearchScreen({
  onBack,
  onSelectPlace,
  onOpenIndoor,
  query,
}: {
  onBack: () => void
  onSelectPlace: (hit: SearchHit) => void
  onOpenIndoor: (roomId: string) => void
  query: string
}) {
  const results = useMemo(() => searchCampus(query), [query])
  return (
    <section className="search-panel panel-enter">
      <button className="back-button" onClick={onBack}>← Back to map</button>
      <p className="eyebrow">CAMPUS SEARCH</p>
      <h2>Where are you going?</h2>
      <div className="result-list">
        {results.length === 0 && <div className="notice"><span>i</span><p>No campus places match “{query}”. Rooms will appear here once indoor map data is added.</p></div>}
        {results.map((hit) => {
          const label = hit.kind === 'place' ? hit.place.name : hit.kind === 'indoor' ? hit.room.name : hit.room.name
          const sub = hit.kind === 'place'
            ? hit.place.category
            : hit.kind === 'indoor'
              ? `MST Building · Floor ${hit.room.floor} · indoor map`
              : `${hit.room.building} · Floor ${hit.room.floor}`
          const open = () => (hit.kind === 'indoor' ? onOpenIndoor(hit.room.id) : onSelectPlace(hit))
          return (
            <div className="search-result-actions" key={hit.kind === 'place' ? hit.place.id : `${hit.kind}-${hit.room.id}`}>
              <button className="place-row" onClick={open}>
                <span className="row-icon">{label.charAt(0)}</span>
                <span><strong>{label}</strong><small>{sub}</small></span>
                <span className="row-arrow">→</span>
              </button>
            </div>
          )
        })}
      </div>
      <div className="notice"><span>i</span><p>Directions work fully offline and only cover the SEAIT campus walkways.</p></div>
    </section>
  )
}

function PlaceDetailCard({ hit, onDirections, onOpenIndoor }: { hit: SearchHit; onDirections: () => void; onOpenIndoor: () => void }) {
  const label = hitLabel(hit)
  return (
    <article className="place-card">
      <div className="place-thumb"><span>{hit.kind === 'place' ? 'FIELD' : 'ROOM'}</span></div>
      <div className="place-info">
        <p className="category">{hit.kind === 'place' ? hit.place.category : `Room · Floor ${hit.room.floor}`}</p>
        <h3>{label}</h3>
        <p className="description">{hit.kind === 'place' ? hit.place.description : hit.kind === 'indoor' ? `${hit.room.name} on floor ${hit.room.floor} of the MST Building. Open the indoor map for in-building directions.` : `${hit.room.name} in ${hit.room.building}. Room routes follow the campus walkways.`}</p>
        {hit.kind === 'place' && hit.place.coordinates && <p className="coordinates">{hit.place.coordinates}</p>}
      </div>
      <div className="place-actions">
        <button className="primary-button" onClick={onDirections}>↗ Get direction</button>
        {hit.kind === 'place' && hit.place.id === 'mst-building' && <button className="secondary-button" onClick={onOpenIndoor}>🏢 MST BUILDING BLUEPRINT</button>}
      </div>
    </article>
  )
}

function DirectionScreen({
  onOpenRoom,
  onOpenCampusPoint,
}: {
  onOpenRoom: (roomId: string | null, panoramaId?: string | null) => void
  onOpenCampusPoint?: (point: number | null, returnScreen?: 'map' | 'direction') => void
}) {
  const [floor, setFloor] = useState('')
  const [roomId, setRoomId] = useState('')
  const [shownRoomId, setShownRoomId] = useState<string | null>(null)
  const [isEntrancePanoZoomed, setIsEntrancePanoZoomed] = useState(false)
  const availableFloors = INDOOR_BUILDING.floors
  const availableRooms = floor ? INDOOR_ROOMS.filter((room) => room.floor === Number(floor)) : []
  const destinationRoom = INDOOR_ROOMS.find((room) => room.id === shownRoomId) ?? null
  const nearestPanoramaId = destinationRoom ? nearestIndoorPanoramaId(destinationRoom.id) : null
  const indoorRoute = destinationRoom ? findIndoorRoute(null, destinationRoom.id) : null
  const clearDirections = () => setShownRoomId(null)
  const hallwayWing = destinationRoom?.nodeId.includes('left-top')
    ? 'upper left'
    : destinationRoom?.nodeId.includes('left-bottom')
      ? 'lower left'
      : destinationRoom?.nodeId.includes('right-top')
        ? 'upper right'
        : destinationRoom?.nodeId.includes('right-bottom')
          ? 'lower right'
          : 'central'
  const firstSegmentPoints = indoorRoute?.segments[0]?.points
  const stairWing = firstSegmentPoints?.[firstSegmentPoints.length - 1]?.x
  const stairSide = stairWing !== undefined && stairWing < 50 ? 'left' : 'right'
  const gateSteps = [
    'Start at the school Main Gate.',
    'Follow the campus driveway and walkway toward the MST Building entrance. Continue at the driveway junction until you reach the entrance.',
  ]
  const campusSteps = destinationRoom?.floor === 1
    ? ['Pass the MST Field and continue toward the MST Building.']
    : [
      'Pass the MST Field and continue toward the MST Building.',
      'Enter the MST Building through the main entrance.',
    ]
  const buildingSteps = destinationRoom ? [
    destinationRoom.floor === 1
      ? 'Enter through the main entrance and continue into the Floor 1 hallway.'
      : `From the main entrance, follow the hallway to the ${stairSide}-wing stairs and go up to Floor ${destinationRoom.floor}.`,
    `On Floor ${destinationRoom.floor}, follow the ${hallwayWing} hallway toward ${destinationRoom.name}.`,
    `Arrive at ${destinationRoom.name}.`,
  ] : []
  const directionSteps = [...gateSteps, ...campusSteps, ...buildingSteps]

  return (
    <section className="direction-screen panel-enter" aria-label="Offline step-by-step campus directions">
      <header className="direction-heading">
        <p className="eyebrow">OFFLINE WALKING DIRECTIONS</p>
        <h2>Find a room</h2>
        <p>Choose a floor and room in the MST Building to get numbered directions from the school gate.</p>
      </header>
      <div className="direction-selectors">
        <label>
          Floor
          <select
            aria-label="Floor"
            value={floor}
            onChange={(event) => {
              setFloor(event.target.value)
              setRoomId('')
              clearDirections()
            }}
          >
            <option value="">Choose a floor</option>
            {availableFloors.map((level) => <option key={level} value={level}>Floor {level}</option>)}
          </select>
        </label>
        <label>
          Room
          <select
            aria-label="Room"
            value={roomId}
            disabled={!floor}
            onChange={(event) => {
              setRoomId(event.target.value)
              clearDirections()
            }}
          >
            <option value="">Choose a room</option>
            {availableRooms.map((room) => {
              const hasDuplicateName = availableRooms.some((candidate) => candidate.id !== room.id && candidate.name === room.name)
              const position = room.nodeId.includes('top') ? 'upper wing' : room.nodeId.includes('bottom') ? 'lower wing' : 'central wing'
              return <option key={room.id} value={room.id}>{hasDuplicateName ? `${room.name} · ${position}` : room.name}</option>
            })}
          </select>
        </label>
      </div>
      <button
        className="primary-button direction-submit"
        type="button"
        disabled={!roomId}
        onClick={() => setShownRoomId(roomId)}
      >
        Show Directions
      </button>
      {destinationRoom && indoorRoute ? (
        <>
          <div className="direction-route-summary" aria-live="polite">
            <strong>{INDOOR_BUILDING.name}</strong>
            <span className="direction-arrow">→</span>
            <strong>Floor {destinationRoom.floor} · {destinationRoom.name}</strong>
          </div>
          <ol className="direction-step-list">
            {directionSteps.map((step, index) => {
              const isEntranceStep = /\bMST Building entrance\b/i.test(step)
              return (
                <li key={`${step}-${index}`}>
                  {step}
                  {isEntranceStep && (
                    <button
                      type="button"
                      className="direction-pano-preview"
                      onClick={() => setIsEntrancePanoZoomed(true)}
                      aria-label="Open MST building entrance view"
                      title="Open MST building entrance view"
                    >
                      <img
                        src="/direction-entrance-final.png"
                        alt="MST building entrance view"
                        style={{ objectPosition: 'center center' }}
                      />
                      <span className="direction-pano-label">Entrance view</span>
                    </button>
                  )}
                  {index === 0 && (
                    <button
                      className="secondary-button direction-indoor-button"
                      type="button"
                      onClick={() => onOpenCampusPoint?.(7, 'direction')}
                    >
                      <span className="direction-blue-dot" aria-hidden="true" />
                      View nearest entrance location
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="direction-hint">Building directions use the mapped stairs; an elevator is not listed in the offline data.</p>
          <button
            className="secondary-button direction-indoor-button"
            type="button"
            disabled={!nearestPanoramaId}
            onClick={() => onOpenRoom(destinationRoom.id, nearestPanoramaId)}
          >
            <span className="direction-blue-dot" aria-hidden="true" />
            {nearestPanoramaId ? 'View room hallway' : 'No nearby room hallway view available'}
          </button>
          {isEntrancePanoZoomed && (
            <div className="direction-pano-modal-backdrop" onClick={() => setIsEntrancePanoZoomed(false)}>
              <div
                className="direction-pano-modal"
                role="dialog"
                aria-modal="true"
                aria-label="MST building entrance preview"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="direction-pano-modal-header">
                  <div>
                    <span className="direction-pano-kicker">Campus entrance</span>
                    <h3>MST Building Entrance</h3>
                  </div>
                  <button type="button" className="direction-pano-close" aria-label="Close entrance preview" onClick={() => setIsEntrancePanoZoomed(false)}>
                    Close
                  </button>
                </div>
                <div className="direction-pano-modal-body">
                  <img src="/direction-entrance-final.png" alt="MST building entrance view" />
                </div>
              </div>
            </div>
          )}
        </>
      ) : shownRoomId ? (
        <p className="direction-error" role="alert">An indoor route for that room is not available in the offline map data.</p>
      ) : (
        <div className="direction-prompt">Select a floor and room, then choose “Show Directions.”</div>
      )}
    </section>
  )
}

function LoadingScreen({ progress }: { progress: number }) {
  const tickCount = 40
  const activeTicks = Math.ceil((progress / 100) * tickCount)

  return (
    <main className="loading-screen" aria-label="Loading MST Guider (SEAIT)">
      <img
        className="loading-building"
        src="/d5bdb47f-2c38-4f94-9830-01634591a7fc.png"
        alt="SEAIT campus introduction"
      />
      <div className="loading-shade" />
      <div className="loading-content">
        <div className="loading-logo-row">
          <div className="loading-logo-stage" role="progressbar" aria-label="Downloading campus guide" aria-valuemin={1} aria-valuemax={100} aria-valuenow={progress}>
            <svg className="loading-ring" viewBox="0 0 132 132" aria-hidden="true">
              <circle className="loading-ring-track" cx="66" cy="66" r="61" />
              {Array.from({ length: tickCount }, (_, index) => {
                const angle = (index / tickCount) * 360 - 90
                const radians = (angle * Math.PI) / 180
                const innerRadius = 55
                const outerRadius = 61
                const x1 = 66 + Math.cos(radians) * innerRadius
                const y1 = 66 + Math.sin(radians) * innerRadius
                const x2 = 66 + Math.cos(radians) * outerRadius
                const y2 = 66 + Math.sin(radians) * outerRadius
                return <line key={index} className={index < activeTicks ? 'loading-ring-tick active' : 'loading-ring-tick'} x1={x1} y1={y1} x2={x2} y2={y2} />
              })}
            </svg>
            <div className="loading-logo-wrap">
              <img className="loading-logo" src="/publicseait-logo.png.jpg" alt="SEAIT logo" onError={(event) => { event.currentTarget.style.display = 'none' }} />
            </div>
          </div>
        </div>
        <p className="loading-kicker">MST GUIDER (SEAIT)</p>
        <h1>SEAIT</h1>
        <p className="loading-status">Downloading your campus guide</p>
      </div>
    </main>
  )
}

function nearestCampusPanoramaPoint(sourcePoint: number, excludedPoints: number[] = []): number | null {
  const source = STREET_VIEW_POINTS.find((entry) => entry.point === sourcePoint)
  if (!source) return null

  const blocked = new Set(excludedPoints)
  blocked.add(sourcePoint)

  let nearestPoint: number | null = null
  let nearestDistance = Infinity
  let nearbyPoint: number | null = null
  let nearbyDistance = Infinity
  const localWalkThreshold = 18

  for (const entry of STREET_VIEW_POINTS) {
    if (blocked.has(entry.point)) continue

    const distance = Math.hypot(entry.image.x - source.image.x, entry.image.y - source.image.y)
    if (distance < nearestDistance) {
      nearestPoint = entry.point
      nearestDistance = distance
    }
    if (distance <= localWalkThreshold && distance < nearbyDistance) {
      nearbyPoint = entry.point
      nearbyDistance = distance
    }
  }

  return nearbyPoint ?? nearestPoint
}

function CampusViewer({
  onClose,
  initialPoint = null,
  returnScreen = 'map',
}: {
  onClose: () => void
  initialPoint?: number | null
  returnScreen?: 'map' | 'direction'
}) {
  const sphereRef = useRef<HTMLDivElement>(null)
  const [mapZoom, setMapZoom] = useState(1)
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 })
  const [selectedPoint, setSelectedPoint] = useState<number | null>(initialPoint)
  const [viewerMode, setViewerMode] = useState<'map' | 'walking'>(initialPoint ? 'walking' : 'map')
  const [failedPanorama, setFailedPanorama] = useState(false)
  const [visitedPanoramas, setVisitedPanoramas] = useState<number[]>([])
  const mapDragRef = useRef({ active: false, startX: 0, startY: 0, startOffset: { x: 0, y: 0 } })

  const activePanorama = STREET_VIEW_POINTS.find((entry) => entry.point === selectedPoint)?.panorama ?? null
  const nearestPanoramaPoint = selectedPoint ? nearestCampusPanoramaPoint(selectedPoint, visitedPanoramas) : null

  useEffect(() => {
    if (selectedPoint === null) return
    setVisitedPanoramas((current) => (current.includes(selectedPoint) ? current : [...current, selectedPoint]))
  }, [selectedPoint])

  useEffect(() => {
    if (viewerMode !== 'walking' || !sphereRef.current) return
    setFailedPanorama(false)
    const container = sphereRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100)
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
    textureLoader.load(
      activePanorama ?? '/point-20-360.jpg.jpg',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.wrapS = THREE.RepeatWrapping
        texture.repeat.x = -1
        texture.offset.x = 1
        sphere.material.map = texture
        sphere.material.needsUpdate = true
      },
      undefined,
      () => setFailedPanorama(true),
    )

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.enableDamping = true
    controls.rotateSpeed = -0.25
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5
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
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.dispose()
      sphere.geometry.dispose()
      sphere.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [viewerMode, activePanorama])

  const changeMapZoom = (amount: number) => {
    setMapZoom((currentZoom) => {
      const nextZoom = Math.min(2.5, Math.max(1, currentZoom + amount))
      if (nextZoom === 1) setMapOffset({ x: 0, y: 0 })
      return nextZoom
    })
  }

  const startMapPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (viewerMode !== 'map' || mapZoom === 1) return
    mapDragRef.current = { active: true, startX: event.clientX, startY: event.clientY, startOffset: mapOffset }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveMapPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mapDragRef.current.active) return
    const { startX, startY, startOffset } = mapDragRef.current
    const maxX = (event.currentTarget.clientWidth * (mapZoom - 1)) / 2
    const maxY = (event.currentTarget.clientHeight * (mapZoom - 1)) / 2
    setMapOffset({
      x: Math.min(maxX, Math.max(-maxX, startOffset.x + event.clientX - startX)),
      y: Math.min(maxY, Math.max(-maxY, startOffset.y + event.clientY - startY)),
    })
  }

  const stopMapPan = () => {
    mapDragRef.current.active = false
  }

  const handlePointClick = (availablePoint: number | null, pendingNumber: number | null) => {
    if (availablePoint !== null) {
      setSelectedPoint(availablePoint)
      setViewerMode('walking')
    } else if (pendingNumber !== null) {
      setSelectedPoint(pendingNumber)
      setViewerMode('map')
    }
  }

  const orderedMapPoints = STREET_VIEW_POINTS.map(({ image, point }) => ({
    image,
    displayNumber: point,
    availablePoint: point,
  }))

  return (
    <section className="viewer-overlay" aria-label="SEAIT 360 campus view">
      <div className="viewer-topbar">
        <div><p className="eyebrow">INTERACTIVE CAMPUS VIEW</p><h2>{viewerMode === 'map' ? 'MST FIELD' : selectedPoint ? 'STREET VIEW' : 'Walking area'}</h2></div>
        <div className="viewer-actions">
          {returnScreen === 'direction' && viewerMode === 'walking' && (
            <button
              type="button"
              className="viewer-back"
              onClick={() => onClose()}
              aria-label="Back to directions"
              title="Back to directions"
            >
              ← Directions
            </button>
          )}
          <button
            className="viewer-close"
            onClick={() => {
              if (viewerMode === 'walking' && returnScreen !== 'direction') {
                setViewerMode('map')
                return
              }
              onClose()
            }}
            aria-label={viewerMode === 'walking' && returnScreen !== 'direction' ? 'Back to map' : 'Close campus view'}
            title={viewerMode === 'walking' && returnScreen !== 'direction' ? 'Back to map' : 'Close campus view'}
          >
            {viewerMode === 'walking' && returnScreen !== 'direction' ? '←' : '×'}
          </button>
        </div>
      </div>
      <div className={viewerMode === 'map' ? 'panorama map-panorama' : 'panorama'} onPointerDown={startMapPan} onPointerMove={moveMapPan} onPointerUp={stopMapPan} onPointerCancel={stopMapPan}>
        {viewerMode === 'map' ? (
          <div className="map-content-layer" style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapZoom})` }}>
            <img src="/campus-aerial.jpg.png" alt="Upper view of the SEAIT campus" />
            <div className="building-point-layer" aria-label="Street view capture points">
              {orderedMapPoints.map(({ image, displayNumber, availablePoint }) => {
                return (
                  <button
                    key={`n${displayNumber}`}
                    type="button"
                    className="building-point available"
                    style={{ left: `${image.x}%`, top: `${image.y}%` }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation()
                      handlePointClick(availablePoint, null)
                    }}
                    aria-label={`Open 360 view for point ${displayNumber}`}
                    title={`Open 360 view for point ${displayNumber}`}
                  >
                    {''}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="sphere-wrapper">
            <div ref={sphereRef} className="sphere-panorama" aria-label="360 walking area panorama" />
            {nearestPanoramaPoint !== null && (
              <button
                type="button"
                className="campus-next-panorama"
                onClick={() => {
                  setSelectedPoint(nearestPanoramaPoint)
                  setViewerMode('walking')
                }}
                aria-label={`Go to the nearest nearby panorama: point ${nearestPanoramaPoint}`}
              >
                Go to nearest walkway
              </button>
            )}
          </div>
        )}
        {viewerMode === 'map' && (
          <div className="map-zoom-controls" aria-label="Map zoom controls" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => changeMapZoom(0.25)} aria-label="Zoom in">+</button>
            <button type="button" onClick={() => changeMapZoom(-0.25)} aria-label="Zoom out">−</button>
          </div>
        )}
        {viewerMode === 'walking' && (
          <div className="viewer-hint">
            {failedPanorama
              ? '360 image missing for this point — add it to /public and register it in src/campus/model.ts'
              : 'Drag to look around — use this to verify if you are standing in the correct spot shown on the map'}
          </div>
        )}
      </div>
      {viewerMode === 'map' && (
        <div className="viewer-footer campus-view-legend">
          <span><i className="campus-view-legend-dot" aria-hidden="true" />View 360 image</span>
        </div>
      )}
    </section>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
