import { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './styles.css'
import { CAMPUS_IMAGE_ASPECT, formatDistance, gpsFromImagePercent, imagePercentFromGps, isInsideCampus } from './campus/geo'
import type { LatLng, Point2D } from './campus/geo'
import { CAMPUS_NODES, CAMPUS_PLACES, STREET_VIEW_POINTS, searchCampus, targetForHit } from './campus/model'
import type { SearchHit } from './campus/model'
import { buildTurnSteps, currentStep, findRoute, formatRouteDistance, nearestNodeId, routeFromLocation, walkProgress } from './campus/routing'
import type { CampusRoute } from './campus/routing'
import { IndoorNavigator } from './IndoorNavigator'

type UserLocation = {
  latitude: number
  longitude: number
  accuracy: number
  heading: number | null
}

type Screen = 'map' | 'search' | 'navigate'

const ARRIVAL_RADIUS = 8
const OFF_ROUTE_LIMIT = 25

/** Demo walk (gate → MST entrance) used when GPS is unavailable, e.g. laptop preview. */
const DEMO_WAYPOINTS_GPS: LatLng[] = [
  { x: 50, y: 93 },
  { x: 50, y: 78 },
  { x: 50, y: 60 },
  { x: 50, y: 49.5 },
].map(gpsFromImagePercent)

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(1)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = window.localStorage.getItem('school-guider-theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })
  const [screen, setScreen] = useState<Screen>('map')
  const [selectedHit, setSelectedHit] = useState<SearchHit | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [viewerPoint, setViewerPoint] = useState<number | null>(null)
  const [navigationTarget, setNavigationTarget] = useState<{ label: string; nodeId: string } | null>(null)
  const [indoorRoomId, setIndoorRoomId] = useState<string | null>(null)
  const [isIndoorOpen, setIsIndoorOpen] = useState(false)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'tracking' | 'error'>('idle')
  const [gpsLocation, setGpsLocation] = useState<UserLocation | null>(null)
  const [isDemoWalking, setIsDemoWalking] = useState(false)
  const locationWatchRef = useRef<number | null>(null)

  const demoLocation = useSimulatedWalk(isDemoWalking, DEMO_WAYPOINTS_GPS)
  const liveLocation: UserLocation | null = demoLocation ?? gpsLocation
  const effectiveStatus: 'idle' | 'locating' | 'tracking' | 'error' = demoLocation ? 'tracking' : locationStatus

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

  useEffect(
    () => () => {
      if (locationWatchRef.current !== null) navigator.geolocation?.clearWatch(locationWatchRef.current)
    },
    [],
  )

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error')
      return
    }
    setLocationStatus('locating')
    if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current)
    locationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
        })
        setLocationStatus('tracking')
      },
      () => setLocationStatus('error'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
  }

  const toggleLocationTracking = () => {
    if (locationWatchRef.current !== null) {
      navigator.geolocation?.clearWatch(locationWatchRef.current)
      locationWatchRef.current = null
      setGpsLocation(null)
      setLocationStatus('idle')
      return
    }
    startLocationTracking()
  }

  const stopNavigation = () => {
    setNavigationTarget(null)
    setIsDemoWalking(false)
    if (locationWatchRef.current !== null) {
      navigator.geolocation?.clearWatch(locationWatchRef.current)
      locationWatchRef.current = null
    }
    setLocationStatus('idle')
  }

  const startNavigation = (target: { label: string; nodeId: string }) => {
    setNavigationTarget(target)
    setIsViewerOpen(false)
    if (!isDemoWalking) startLocationTracking()
  }

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

  const open360Viewer = (point: number | null) => {
    setViewerPoint(point)
    setIsViewerOpen(true)
  }

  const openIndoorNavigator = (roomId: string | null) => {
    setIndoorRoomId(roomId)
    setIsIndoorOpen(true)
  }

  const liveGps: LatLng | null = liveLocation ? { latitude: liveLocation.latitude, longitude: liveLocation.longitude } : null
  const userPercent = liveGps ? imagePercentFromGps(liveGps) : null

  if (isLoading) return <LoadingScreen progress={loadingProgress} />

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-label="SEAIT logo"><span>SEAIT</span><img src="/publicseait-logo.png.jpg" alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} /></div>
        <div>
          <p className="eyebrow">SEAIT CAMPUS GUIDE</p>
          <h1>SEAIT (SOUTH EAST ASIA INSTITUTE OF TECHNOLOGY)</h1>
        </div>
      </header>

      <section className="content" aria-live="polite">
        {screen === 'search' && (
          <SearchScreen
            onBack={() => setScreen('map')}
            onSelectPlace={openSearchHit}
            onNavigate={(target) => startNavigation(target)}
            onOpenIndoor={(roomId) => openIndoorNavigator(roomId)}
          />
        )}

        {screen === 'navigate' && (
          <NavigateScreen
            hit={selectedHit}
            liveGps={liveGps}
            onBack={() => setScreen('map')}
            onStart={(target) => startNavigation(target)}
          />
        )}

        {screen === 'map' && (
          <>
            <div className="dashboard-layout">
              <section className="aerial-view-card panel-enter" aria-label="SEAIT aerial view">
                <div className="front-view-heading"><div><p className="eyebrow">CAMPUS VIEW</p><h2>Aerial view</h2></div></div>
                <div className="map-card">
                  <CampusMapCanvas
                    userPercent={userPercent}
                    route={null}
                    destinationPercent={null}
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
              <img className="dashboard-front-image" src="/d5bdb47f-2c38-4f94-9830-01634591a7fc.png" alt="Front view of the SEAIT building" />
            </section>

            <section className="section-heading">
              <div><p className="eyebrow">SELECTED AREA</p><h2>{selectedHit ? hitLabel(selectedHit) : 'MST Building'}</h2></div>
              <span className="verified-badge">{selectedHit?.kind === 'place' && selectedHit.place.status === 'pending' ? 'PENDING' : 'VERIFIED'}</span>
            </section>
            <PlaceDetailCard
              hit={selectedHit ?? { kind: 'place', place: CAMPUS_PLACES[0] }}
              onNavigate={() => setScreen('navigate')}
              onOpenIndoor={() => openIndoorNavigator(null)}
            />
          </>
        )}
      </section>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={screen === 'map' && !isIndoorOpen && !isViewerOpen ? 'nav-item active' : 'nav-item'} onClick={() => { setIsIndoorOpen(false); setIsViewerOpen(false); setNavigationTarget(null); setScreen('map') }}><span>⌖</span><small>Map</small></button>
        <button className={isIndoorOpen ? 'nav-item active' : 'nav-item'} type="button" onClick={() => { setIsViewerOpen(false); setNavigationTarget(null); setScreen('map'); openIndoorNavigator(null) }} aria-label="Open MST building map"><span>⌂</span><small>MST BUILDING</small></button>
        <button className={screen === 'search' ? 'nav-item active' : 'nav-item'} onClick={() => { setIsIndoorOpen(false); setIsViewerOpen(false); setNavigationTarget(null); setScreen('search') }}><span>⌕</span><small>Explore</small></button>
        <button className={isViewerOpen ? 'nav-item active' : 'nav-item'} type="button" onClick={() => { setIsIndoorOpen(false); setNavigationTarget(null); setScreen('map'); open360Viewer(null) }} aria-label="Open campus 360 views"><span>◎</span><small>MST FIELD</small></button>
        <button className={screen === 'navigate' ? 'nav-item active' : 'nav-item'} onClick={() => { setIsIndoorOpen(false); setIsViewerOpen(false); setScreen('navigate') }}><span>↗</span><small>Navigate</small></button>
      </nav>

      {isViewerOpen && <CampusViewer initialPoint={viewerPoint} onClose={() => setIsViewerOpen(false)} />}
      {isIndoorOpen && <IndoorNavigator initialRoomId={indoorRoomId} onClose={() => setIsIndoorOpen(false)} />}
      {navigationTarget && (
        <NavigationOverlay
          target={navigationTarget}
          location={liveLocation}
          status={effectiveStatus}
          onClose={stopNavigation}
          onDemo={() => setIsDemoWalking(true)}
        />
      )}
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

/** Renders the campus aerial photo with route polyline, destination pin, and live user dot. */
function CampusMapCanvas({
  userPercent,
  route,
  destinationPercent,
  showPlaceMarkers = false,
  onPlaceMarker,
}: {
  userPercent: Point2D | null
  route: CampusRoute | null
  destinationPercent: Point2D | null
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

  // The photo uses object-fit: contain, so compute the exact displayed image
  // rect. All percent coordinates are relative to THAT rect — this is what
  // keeps the blue dot on the precise spot the user stands on.
  const displayed = displayedImageRect(frame.width, frame.height, CAMPUS_IMAGE_ASPECT)

  return (
    <div ref={gridRef} className="map-grid" aria-label="Campus map">
      <img className="aerial-image" src="/campus-aerial.jpg.png" alt="Upper view of the SEAIT campus" onError={(event) => { event.currentTarget.style.display = 'none' }} />
      <svg className="campus-overlay-svg" viewBox={`0 0 ${frame.width || 100} ${frame.height || 100}`} preserveAspectRatio="none" aria-hidden="true">
        {route && <polyline className="route-polyline-casing" points={route.linePercent.map((point) => `${displayed.left + (point.x / 100) * displayed.width},${displayed.top + (point.y / 100) * displayed.height}`).join(' ')} />}
        {route && <polyline className="route-polyline" points={route.linePercent.map((point) => `${displayed.left + (point.x / 100) * displayed.width},${displayed.top + (point.y / 100) * displayed.height}`).join(' ')} />}
      </svg>
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
      {destinationPercent && (
        <div className="map-destination-pin" style={{ left: `${displayed.left + (destinationPercent.x / 100) * displayed.width}px`, top: `${displayed.top + (destinationPercent.y / 100) * displayed.height}px` }} aria-label="Destination"><span>★</span></div>
      )}
      {userPercent && (
        <div className="navigation-user on-map" style={{ left: `${displayed.left + (userPercent.x / 100) * displayed.width}px`, top: `${displayed.top + (userPercent.y / 100) * displayed.height}px` }} aria-label="Your location"><span style={{ background: '#007aff', boxShadow: '0 0 12px #007aff' }} /></div>
      )}
    </div>
  )
}

/** Letterboxed image rect inside a container with object-fit: contain. */
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
  onNavigate,
  onOpenIndoor,
}: {
  onBack: () => void
  onSelectPlace: (hit: SearchHit) => void
  onNavigate: (target: { label: string; nodeId: string }) => void
  onOpenIndoor: (roomId: string) => void
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchCampus(query), [query])
  return (
    <section className="search-panel panel-enter">
      <button className="back-button" onClick={onBack}>← Back to map</button>
      <p className="eyebrow">CAMPUS SEARCH</p>
      <h2>Where are you going?</h2>
      <div className="search-field">
        <span>⌕</span>
        <input aria-label="Search campus" placeholder="Search buildings, areas, or rooms" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
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
              <button className="mini-navigate" onClick={() => (hit.kind === 'indoor' ? onOpenIndoor(hit.room.id) : onNavigate(targetForHit(hit)))} aria-label={`Navigate to ${label}`}>↗</button>
            </div>
          )
        })}
      </div>
      <div className="notice"><span>i</span><p>Directions work fully offline and only cover the SEAIT campus walkways.</p></div>
    </section>
  )
}

function PlaceDetailCard({ hit, onNavigate, onOpenIndoor }: { hit: SearchHit; onNavigate: () => void; onOpenIndoor: () => void }) {
  const label = hitLabel(hit)
  const isMstBuilding = hit.kind === 'place' && hit.place.id === 'mst-building'
  return (
    <article className="place-card">
      <div className="place-thumb"><span>{hit.kind === 'place' ? (hit.place.id === 'mst-building' ? 'MST' : 'FIELD') : 'ROOM'}</span></div>
      <div className="place-info">
        <p className="category">{hit.kind === 'place' ? hit.place.category : `Room · Floor ${hit.room.floor}`}</p>
        <h3>{label}</h3>
        <p className="description">{hit.kind === 'place' ? hit.place.description : hit.kind === 'indoor' ? `${hit.room.name} on floor ${hit.room.floor} of the MST Building. Open the indoor map for in-building directions.` : `${hit.room.name} in ${hit.room.building}. Room routes follow the campus walkways.`}</p>
        {hit.kind === 'place' && hit.place.coordinates && <p className="coordinates">{hit.place.coordinates}</p>}
      </div>
      <div className="place-actions">
        <button className="primary-button" onClick={onNavigate}>↗ Directions</button>
        {isMstBuilding && <button className="secondary-button" onClick={onOpenIndoor}>🏢 Blueprint</button>}
      </div>
    </article>
  )
}

function NavigateScreen({
  hit,
  liveGps,
  onBack,
  onStart,
}: {
  hit: SearchHit | null
  liveGps: LatLng | null
  onBack: () => void
  onStart: (target: { label: string; nodeId: string }) => void
}) {
  const safeHit: SearchHit = hit ?? { kind: 'place', place: CAMPUS_PLACES[0] }
  const target = targetForHit(safeHit)
  const originNodeId = liveGps ? nearestNodeId(liveGps) : 'gate'
  const route = useMemo(() => findRoute(originNodeId, target.nodeId), [originNodeId, target.nodeId])
  const steps = route ? buildTurnSteps(route) : []
  const insideCampus = liveGps ? isInsideCampus(liveGps) : true
  return (
    <section className="navigate-screen panel-enter">
      <button className="back-button" onClick={onBack}>← Back to map</button>
      <div className="route-hero">
        <p className="eyebrow">CAMPUS WALKING ROUTE</p>
        <h2>Directions to<br /><em>{target.label}</em></h2>
        <div className="route-line"><span className="route-start" /><div><strong>{liveGps ? 'Start from your location' : 'Start from the main gate'}</strong><small>{liveGps ? 'Your live GPS position is used' : 'Open the app on campus to start from where you stand'}</small></div></div>
        <div className="route-line"><span className="route-end" /><div><strong>{target.label}</strong><small>{route ? `${formatRouteDistance(route.totalDistance)} · ${Math.max(0, steps.length - 1)} steps` : 'Route pending'}</small></div></div>
      </div>
      {route && (
        <ol className="turn-list preview">
          {steps.map((step) => (
            <li key={step.index} className={`turn-step ${step.action}`}>
              <span className={`turn-icon ${step.action}`}>{turnGlyph(step.action)}</span>
              <div><strong>{step.instruction}</strong><small>{step.distance > 0 ? formatRouteDistance(step.distance) : 'Destination'}</small></div>
            </li>
          ))}
        </ol>
      )}
      <button className="primary-button full-width" onClick={() => onStart(target)}>Start walking route</button>
      {!insideCampus && <div className="notice"><span>!</span><p>You appear to be outside the SEAIT campus. Please walk through the SEAIT location to see the dot of your location on the map.</p></div>}
      <div className="notice"><span>i</span><p>Routes follow verified campus walkways only. No internet or external map service is used.</p></div>
    </section>
  )
}

function turnGlyph(action: string) {
  if (action === 'left') return '↰'
  if (action === 'right') return '↱'
  if (action === 'arrive') return '◎'
  return '↑'
}

function NavigationOverlay({
  target,
  location,
  status,
  onClose,
  onDemo,
}: {
  target: { label: string; nodeId: string }
  location: UserLocation | null
  status: 'idle' | 'locating' | 'tracking' | 'error'
  onClose: () => void
  onDemo: () => void
}) {
  const gps: LatLng | null = location ? { latitude: location.latitude, longitude: location.longitude } : null
  const originNodeId = gps ? nearestNodeId(gps) : 'gate'
  const route = useMemo(
    () => (gps ? routeFromLocation(gps, target.nodeId) : findRoute('gate', target.nodeId)),
    [originNodeId, target.nodeId],
  )
  const progress = route && gps ? walkProgress(route, gps) : null
  const remaining = progress?.remaining ?? route?.totalDistance ?? null
  const offRoute = progress?.offRoute ?? 0
  const arrived = remaining !== null && remaining <= ARRIVAL_RADIUS
  const insideCampus = gps ? isInsideCampus(gps) : true
  const userPercent = gps ? imagePercentFromGps(gps) : null
  const destinationPercent = nodeImagePercentCached(target.nodeId)
  const steps = route ? buildTurnSteps(route) : []
  const nextStep = route && gps ? currentStep(route, gps) : steps[1] ?? steps[0] ?? null
  const walkBearing = progress?.bearing ?? null
  const arrowRotation = walkBearing != null ? (location?.heading != null ? walkBearing - location.heading : walkBearing) : 0
  const etaMinutes = remaining !== null ? Math.max(1, Math.round(remaining / 72)) : null

  return (
    <section className="navigation-overlay" aria-label="Campus walking navigation">
      <header className="navigation-header">
        <button className="navigation-close" onClick={onClose} aria-label="Stop navigation">×</button>
        <div><p className="eyebrow">CAMPUS NAVIGATION</p><h2>{target.label}</h2></div>
        <span className={`gps-status ${status}`} aria-label={status === 'tracking' ? 'Live location on' : status}>
          {status === 'tracking' ? '●' : status === 'locating' ? '◌' : '○'}
        </span>
      </header>

      <div className="navigation-map-wrap">
        <div className="navigation-map">
          <CampusMapCanvas userPercent={userPercent} route={route} destinationPercent={destinationPercent} />
          <div className="navigation-map-label">SEAIT CAMPUS · OFFLINE MAP</div>
        </div>
      </div>

      <div className="navigation-sheet">
        {arrived ? (
          <div className="arrival-card">
            <strong>🎉 You have arrived</strong>
            <p>{target.label} — destination reached. You can now follow the indoor map instructions if you are inside the building.</p>
            <button className="primary-button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {!insideCampus && <div className="nav-banner outside">You are currently outside the SEAIT campus. Please walk toward the school grounds to see your position on the map.</div>}
            {insideCampus && offRoute > OFF_ROUTE_LIMIT && <div className="nav-banner offroute">You are off the campus walkway. Head back toward the highlighted route.</div>}
            {status === 'error' && <div className="nav-banner outside">Location is unavailable. Allow location access, or run the demo walk below.</div>}
            <div className="navigation-next">
              <span className="direction-arrow" style={{ transform: `rotate(${arrowRotation}deg)` }}>{turnGlyph(nextStep?.action ?? 'straight')}</span>
              <div>
                <p className="eyebrow">{nextStep?.action === 'arrive' ? 'DESTINATION' : 'NEXT DIRECTION'}</p>
                <strong>{nextStep ? nextStep.instruction : 'Preparing route…'}</strong>
                <small>
                  {walkBearing != null ? `Walk ${Math.round((walkBearing + 360) % 360)}° · ` : ''}
                  {status === 'tracking' ? 'Live location on' : status === 'locating' ? 'Finding your location…' : 'GPS off'}
                </small>
              </div>
            </div>
            <div className="navigation-stats">
              <div><span>Distance left</span><strong>{remaining === null ? '--' : formatDistance(remaining)}</strong></div>
              <div><span>Time on foot</span><strong>{etaMinutes === null ? '--' : `~${etaMinutes} min`}</strong></div>
              <div><span>Accuracy</span><strong>{location ? `±${Math.round(location.accuracy)} m` : '--'}</strong></div>
              <div><span>Steps left</span><strong>{steps.length > 1 ? steps.length - 1 : '--'}</strong></div>
            </div>
            {status !== 'tracking' && <button className="demo-button" onClick={onDemo}>▶ Run demo walk (no GPS needed)</button>}
            <button className="navigation-stop" onClick={onClose}>Stop navigation</button>
          </>
        )}
      </div>
    </section>
  )
}

/** Steps through waypoint positions so the app can be demoed without physically moving. */
function useSimulatedWalk(active: boolean, waypoints: LatLng[]) {
  const [location, setLocation] = useState<UserLocation | null>(null)
  useEffect(() => {
    if (!active || waypoints.length < 2) {
      setLocation(null)
      return
    }
    const subSteps = 6
    let segment = 0
    let sub = 0
    let timer = 0
    const settle = () => {
      const last = waypoints[waypoints.length - 1]
      setLocation({ latitude: last.latitude, longitude: last.longitude, accuracy: 4, heading: null })
    }
    const tick = () => {
      if (segment >= waypoints.length - 1) {
        settle()
        return
      }
      sub += 1
      if (sub > subSteps) {
        sub = 1
        segment += 1
        if (segment >= waypoints.length - 1) {
          settle()
          return
        }
      }
      const from = waypoints[segment]
      const to = waypoints[segment + 1]
      const t = sub / subSteps
      setLocation({
        latitude: from.latitude + (to.latitude - from.latitude) * t,
        longitude: from.longitude + (to.longitude - from.longitude) * t,
        accuracy: 4,
        heading: null,
      })
      timer = window.setTimeout(tick, 450)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [active, waypoints])
  return location
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

function CampusViewer({ onClose, initialPoint = null }: { onClose: () => void; initialPoint?: number | null }) {
  const sphereRef = useRef<HTMLDivElement>(null)
  const [mapZoom, setMapZoom] = useState(1)
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 })
  const [selectedPoint, setSelectedPoint] = useState<number | null>(initialPoint)
  const [viewerMode, setViewerMode] = useState<'map' | 'walking'>(initialPoint ? 'walking' : 'map')
  const [failedPanorama, setFailedPanorama] = useState(false)
  const mapDragRef = useRef({ active: false, startX: 0, startY: 0, startOffset: { x: 0, y: 0 } })

  const activePanorama = STREET_VIEW_POINTS.find((entry) => entry.point === selectedPoint)?.panorama ?? null

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
        <button
          className="viewer-close"
          onClick={() => (viewerMode === 'walking' ? setViewerMode('map') : onClose())}
          aria-label={viewerMode === 'walking' ? 'Back to SEAIT map' : 'Close campus view'}
          title={viewerMode === 'walking' ? 'Back to SEAIT map' : 'Close campus view'}
        >
          {viewerMode === 'walking' ? '←' : '×'}
        </button>
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
                    {displayNumber}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div ref={sphereRef} className="sphere-panorama" aria-label="360 walking area panorama" />
        )}
        {viewerMode === 'map' && (
          <div className="map-zoom-controls" aria-label="Map zoom controls" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => changeMapZoom(0.25)} aria-label="Zoom in">+</button>
            <button type="button" onClick={() => changeMapZoom(-0.25)} aria-label="Zoom out">−</button>
          </div>
        )}
        <div className="viewer-hint">
          {viewerMode === 'walking'
            ? failedPanorama
              ? '360 image missing for this point — add it to /public and register it in src/campus/model.ts'
              : 'Drag to look around — use this to verify if you are standing in the correct spot shown on the map'
            : selectedPoint && !STREET_VIEW_POINTS.some((entry) => entry.point === selectedPoint)
              ? `Point ${selectedPoint} selected — 360 image pending`
              : 'Blue points open 360 street views · Use them to verify your location visually'}
        </div>
      </div>
    </section>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
