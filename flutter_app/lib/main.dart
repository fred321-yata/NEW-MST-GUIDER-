import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import 'campus_data.dart';

void main() {
  runApp(const MstGuiderApp());
}

class MstGuiderApp extends StatelessWidget {
  const MstGuiderApp({super.key});

  @override
  Widget build(BuildContext context) {
    const navy = Color(0xFF123B72);
    return MaterialApp(
      title: 'MST Guider (SEAIT)',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: navy,
          primary: navy,
          surface: const Color(0xFFF5F7FA),
        ),
        scaffoldBackgroundColor: const Color(0xFFF5F7FA),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFF5F7FA),
          foregroundColor: Color(0xFF162234),
          surfaceTintColor: Colors.transparent,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFFE4E9F0)),
          ),
        ),
      ),
      home: const GuiderHome(),
    );
  }
}

class GuiderHome extends StatefulWidget {
  const GuiderHome({super.key});

  @override
  State<GuiderHome> createState() => _GuiderHomeState();
}

class _GuiderHomeState extends State<GuiderHome> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  List<IndoorRoom> _rooms = const [];
  int _selectedTab = 0;
  int _selectedFloor = 1;
  int? _panoramaPoint;
  int? _indoorPanoramaFloor;
  int _indoorPanoramaIndex = 0;
  String? _selectedRoomId;
  String? _selectedPlaceId;
  String _searchQuery = '';
  MapPoint? _userPosition;
  bool _isLoadingRooms = true;
  bool _isLocating = false;
  Object? _roomLoadError;

  IndoorRoom? get _selectedRoom {
    for (final room in _rooms) {
      if (room.id == _selectedRoomId) return room;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _loadRooms();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  Future<void> _loadRooms() async {
    try {
      final rooms = await CampusData.loadIndoorRooms();
      if (!mounted) return;
      setState(() {
        _rooms = rooms;
        _isLoadingRooms = false;
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _roomLoadError = error;
        _isLoadingRooms = false;
      });
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _locateMe() async {
    if (_isLocating) return;
    setState(() => _isLocating = true);
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showMessage('Turn on location services to show your position.');
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        _showMessage('Location permission was denied.');
        return;
      }
      if (permission == LocationPermission.deniedForever) {
        _showMessage(
          'Allow location access in Android app settings to use this feature.',
        );
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
      final point = CampusData.imagePercentFromGps(
        position.latitude,
        position.longitude,
      );
      if (!mounted) return;
      setState(() => _userPosition = point);
      if (point == null) {
        _showMessage('Could not project your location onto the campus map.');
      } else if (!CampusData.isInsideCampus(
        position.latitude,
        position.longitude,
      )) {
        _showMessage(
          'You are outside the campus boundary. Follow the map toward the main gate.',
        );
      } else {
        _showMessage('Your current position is shown on the campus map.');
      }
    } on TimeoutException {
      _showMessage('Location request timed out. Try again in an open area.');
    } on Object catch (error) {
      _showMessage('Could not get your location: $error');
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  void _openRoom(IndoorRoom room) {
    _searchFocusNode.unfocus();
    setState(() {
      _selectedRoomId = room.id;
      _selectedFloor = room.floor;
      _selectedPlaceId = null;
      _selectedTab = 3;
      _panoramaPoint = null;
    });
  }

  void _openPlace(CampusPlace place) {
    _searchFocusNode.unfocus();
    setState(() {
      _selectedPlaceId = place.id;
      _selectedTab = 0;
      _panoramaPoint = null;
    });
  }

  void _openPanorama(int point) {
    setState(() {
      _panoramaPoint = point;
      _indoorPanoramaFloor = null;
      _selectedTab = 0;
    });
  }

  void _openIndoorPanorama(int floor) {
    setState(() {
      _panoramaPoint = null;
      _indoorPanoramaFloor = floor;
      _indoorPanoramaIndex = 0;
    });
  }

  List<CampusPlace> get _matchingPlaces {
    final needle = _searchQuery.trim().toLowerCase();
    if (needle.isEmpty) return CampusData.places;
    return CampusData.places
        .where(
          (place) =>
              place.name.toLowerCase().contains(needle) ||
              place.category.toLowerCase().contains(needle),
        )
        .toList();
  }

  List<IndoorRoom> get _matchingRooms {
    final needle = _searchQuery.trim().toLowerCase();
    if (needle.isEmpty) return const [];
    return _rooms
        .where((room) => room.name.toLowerCase().contains(needle))
        .take(12)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingRooms) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_roomLoadError != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 42),
                const SizedBox(height: 12),
                const Text(
                  'Campus room data could not be loaded.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  '$_roomLoadError',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () {
                    setState(() {
                      _isLoadingRooms = true;
                      _roomLoadError = null;
                    });
                    _loadRooms();
                  },
                  child: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final indoorFloor = _indoorPanoramaFloor;
    final panoramaPoint = _panoramaPoint;
    final title = indoorFloor != null
        ? 'MST Building · Floor $indoorFloor view'
        : panoramaPoint != null
        ? 'Campus view ${panoramaPoint.toString().padLeft(2, '0')}'
        : 'SEAIT Campus Guide';
    return Scaffold(
      appBar: AppBar(
        leading: _panoramaPoint == null && _indoorPanoramaFloor == null
            ? null
            : IconButton(
                tooltip: 'Back to map',
                onPressed: () => setState(() {
                  _panoramaPoint = null;
                  _indoorPanoramaFloor = null;
                }),
                icon: const Icon(Icons.arrow_back),
              ),
        titleSpacing: _panoramaPoint == null && _indoorPanoramaFloor == null
            ? 16
            : 0,
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.asset(
                'assets/images/seait-logo.jpg',
                width: 36,
                height: 36,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        actions: [
          if (_panoramaPoint == null && _indoorPanoramaFloor == null)
            IconButton(
              onPressed: _locateMe,
              tooltip: 'Show my location',
              icon: _isLocating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.my_location),
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: indoorFloor != null
          ? _buildIndoorPanorama(indoorFloor)
          : panoramaPoint != null
          ? _buildPanorama(panoramaPoint)
          : IndexedStack(
              index: _selectedTab,
              children: [
                _buildMapTab(),
                _buildSearchTab(),
                _buildDirectionsTab(),
                _buildBuildingTab(),
              ],
            ),
      bottomNavigationBar:
          _panoramaPoint == null && _indoorPanoramaFloor == null
          ? NavigationBar(
              selectedIndex: _selectedTab,
              onDestinationSelected: (index) {
                _searchFocusNode.unfocus();
                setState(() => _selectedTab = index);
              },
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.map_outlined),
                  selectedIcon: Icon(Icons.map),
                  label: 'Map',
                ),
                NavigationDestination(
                  icon: Icon(Icons.search),
                  label: 'Search',
                ),
                NavigationDestination(
                  icon: Icon(Icons.directions_walk),
                  label: 'Directions',
                ),
                NavigationDestination(
                  icon: Icon(Icons.apartment_outlined),
                  selectedIcon: Icon(Icons.apartment),
                  label: 'MST building',
                ),
              ],
            )
          : null,
    );
  }

  Widget _buildMapTab() {
    final route = _selectedPlaceId == null
        ? null
        : CampusData.outdoorRouteForPlace(_selectedPlaceId!);
    final selectedPlace = CampusData.placeById(_selectedPlaceId);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
        Text(
          'Explore the campus',
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        Text(
          'Offline campus map and walking guide for SEAIT.',
          style: Theme.of(context).textTheme.bodyMedium
              ?.copyWith(color: const Color(0xFF657184)),
        ),
        const SizedBox(height: 16),
        _searchField('Explore buildings, areas, or rooms'),
        const SizedBox(height: 14),
        _SectionCard(
          eyebrow: 'CAMPUS VIEW',
          title: 'Top view',
          trailing: IconButton(
            onPressed: _locateMe,
            tooltip: 'Show my location',
            icon: const Icon(Icons.my_location),
          ),
          child: CampusMapView(
            route: route,
            userPosition: _userPosition,
            selectedNodeId: selectedPlace?.nodeId,
            onPlaceTap: (place) => _openPlace(place),
            onPanoramaTap: _openPanorama,
          ),
        ),
        const SizedBox(height: 14),
        if (selectedPlace != null) ...[
          _PlaceDetail(
            place: selectedPlace,
            onDirections: () => setState(() => _selectedTab = 2),
            onOpenBuilding: () => setState(() => _selectedTab = 3),
          ),
          const SizedBox(height: 14),
        ],
        _SectionCard(
          eyebrow: 'CAMPUS VIEW',
          title: 'Front view',
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.asset(
              'assets/images/campus-front.png',
              height: 180,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
        ),
        const SizedBox(height: 14),
        _SectionCard(
          eyebrow: 'QUICK ACCESS',
          title: 'Find your way',
          child: Column(
            children: [
              _ShortcutRow(
                icon: Icons.apartment,
                title: 'MST Building',
                subtitle: 'Browse 79 rooms on four floors',
                onTap: () => setState(() => _selectedTab = 3),
              ),
              const Divider(height: 1),
              _ShortcutRow(
                icon: Icons.directions_walk,
                title: 'Room directions',
                subtitle: 'Get offline directions from the main gate',
                onTap: () => setState(() => _selectedTab = 2),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const _OfflineNote(),
      ],
    );
  }

  Widget _buildSearchTab() {
    final places = _matchingPlaces;
    final rooms = _matchingRooms;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
        Text(
          'Where are you going?',
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        _searchField('Search buildings, areas, or rooms'),
        const SizedBox(height: 16),
        if (places.isEmpty && rooms.isEmpty)
          const _EmptyNotice('No campus places match your search.')
        else ...[
          if (places.isNotEmpty) ...[
            const _Eyebrow('CAMPUS PLACES'),
            const SizedBox(height: 8),
            ...places.map(
              (place) => _ResultTile(
                icon: Icons.place_outlined,
                title: place.name,
                subtitle: place.category,
                onTap: () => _openPlace(place),
              ),
            ),
          ],
          if (rooms.isNotEmpty) ...[
            const SizedBox(height: 16),
            const _Eyebrow('MST BUILDING ROOMS'),
            const SizedBox(height: 8),
            ...rooms.map(
              (room) => _ResultTile(
                icon: Icons.meeting_room_outlined,
                title: room.name,
                subtitle: 'MST Building · Floor ${room.floor}',
                onTap: () => _openRoom(room),
              ),
            ),
          ],
        ],
        const SizedBox(height: 16),
        const _OfflineNote(),
      ],
    );
  }

  Widget _buildDirectionsTab() {
    final selectedPlace = CampusData.placeById(_selectedPlaceId);
    final outdoorRoute = selectedPlace == null
        ? null
        : CampusData.outdoorRouteForPlace(selectedPlace.id);
    final floorRooms = _rooms
        .where((room) => room.floor == _selectedFloor)
        .toList();
    final selectedRoom = _selectedRoom;
    final indoorRoute = selectedRoom == null
        ? null
        : CampusData.indoorRoute(selectedRoom);
    final routePoints =
        indoorRoute?.pointsForFloor(_selectedFloor) ?? const <MapPoint>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
        Text(
          'Find a room',
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        const Text(
          'Offline walking directions from the school main gate.',
          style: TextStyle(color: Color(0xFF657184)),
        ),
        const SizedBox(height: 18),
        if (selectedPlace != null && outdoorRoute != null) ...[
          _SectionCard(
            eyebrow: 'CAMPUS ROUTE',
            title: '${selectedPlace.name} · from Main Gate',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CampusMapView(
                  route: outdoorRoute,
                  userPosition: null,
                  selectedNodeId: selectedPlace.nodeId,
                  onPlaceTap: _openPlace,
                  onPanoramaTap: _openPanorama,
                ),
                const SizedBox(height: 12),
                _RouteStep(number: 1, text: 'Start at the school Main Gate.'),
                _RouteStep(
                  number: 2,
                  text: selectedPlace.id == 'mst-field'
                      ? 'Follow the campus driveway toward the MST Field.'
                      : 'Continue past the MST Field to the MST Building entrance.',
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],
        _SectionCard(
          eyebrow: 'DESTINATION',
          title: 'MST Building',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DropdownButtonFormField<int>(
                initialValue: _selectedFloor,
                decoration: const InputDecoration(
                  labelText: 'Floor',
                  border: OutlineInputBorder(),
                ),
                items: List.generate(
                  4,
                  (index) => DropdownMenuItem(
                    value: index + 1,
                    child: Text('Floor ${index + 1}'),
                  ),
                ),
                onChanged: (floor) {
                  if (floor == null) return;
                  setState(() {
                    _selectedFloor = floor;
                    if (_selectedRoom?.floor != floor) _selectedRoomId = null;
                  });
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                key: ValueKey(_selectedFloor),
                initialValue:
                    floorRooms.any((room) => room.id == _selectedRoomId)
                    ? _selectedRoomId
                    : null,
                decoration: const InputDecoration(
                  labelText: 'Room',
                  border: OutlineInputBorder(),
                ),
                isExpanded: true,
                hint: const Text('Choose a room'),
                items: floorRooms
                    .map(
                      (room) => DropdownMenuItem(
                        value: room.id,
                        child: Text(room.name, overflow: TextOverflow.ellipsis),
                      ),
                    )
                    .toList(),
                onChanged: (roomId) {
                  setState(() => _selectedRoomId = roomId);
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (indoorRoute != null && selectedRoom != null) ...[
          _SectionCard(
            eyebrow: 'INDOOR ROUTE',
            title: '${selectedRoom.name} · Floor ${selectedRoom.floor}',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IndoorMapView(
                  floor: _selectedFloor,
                  rooms: _rooms,
                  selectedRoomId: selectedRoom.id,
                  route: routePoints,
                  onRoomTap: _openRoom,
                ),
                const SizedBox(height: 14),
                _RouteStep(number: 1, text: 'Start at the school Main Gate.'),
                _RouteStep(
                  number: 2,
                  text: 'Follow the campus driveway past the MST Field to the MST Building entrance.',
                ),
                for (var i = 0; i < indoorRoute.steps.length; i++)
                  _RouteStep(number: i + 3, text: indoorRoute.steps[i]),
              ],
            ),
          ),
        ] else
          const _EmptyNotice('Choose a room to see its route and floor map.'),
      ],
    );
  }

  Widget _buildBuildingTab() {
    final rooms = _rooms.where((room) => room.floor == _selectedFloor).toList();
    final route = _selectedRoom == null
        ? const <MapPoint>[]
        : CampusData.indoorRoute(_selectedRoom!)
                  ?.pointsForFloor(_selectedFloor) ??
              const <MapPoint>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      children: [
        Text(
          'MST Building',
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        Text(
          '${_rooms.length} searchable rooms · four floors',
          style: const TextStyle(color: Color(0xFF657184)),
        ),
        const SizedBox(height: 14),
        _SectionCard(
          eyebrow: 'FLOOR PLAN',
          title: 'Floor $_selectedFloor',
          child: Column(
            children: [
              _FloorSelector(
                selectedFloor: _selectedFloor,
                onChanged: (floor) => setState(() => _selectedFloor = floor),
              ),
              const SizedBox(height: 12),
              IndoorMapView(
                floor: _selectedFloor,
                rooms: _rooms,
                selectedRoomId: _selectedRoomId,
                route: route,
                onRoomTap: _openRoom,
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _SectionCard(
          eyebrow: 'ROOMS',
          title: '${rooms.length} on this floor',
          child: Column(
            children: [
              for (final room in rooms)
                _ResultTile(
                  icon: _roomIcon(room.kind),
                  title: room.name,
                  subtitle: room.kind.replaceAll('-', ' '),
                  selected: room.id == _selectedRoomId,
                  onTap: () {
                    setState(() => _selectedRoomId = room.id);
                  },
                ),
            ],
          ),
        ),
        if (_selectedRoom != null) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: () => setState(() => _selectedTab = 2),
                icon: const Icon(Icons.directions_walk),
                label: Text('Directions to ${_selectedRoom!.name}'),
              ),
              OutlinedButton.icon(
                onPressed: () => _openIndoorPanorama(_selectedRoom!.floor),
                icon: const Icon(Icons.threesixty),
                label: Text('Floor ${_selectedRoom!.floor} views'),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildPanorama(int point) {
    final asset = CampusData.outdoorPanoramaAsset(point);
    return ColoredBox(
      color: const Color(0xFF101820),
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Text(
              'Pinch to zoom and drag to explore this offline campus view.',
              style: TextStyle(color: Colors.white70),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: InteractiveViewer(
              minScale: 1,
              maxScale: 5,
              child: Center(
                child: Image.asset(
                  asset,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'This panorama image is not available.',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIndoorPanorama(int floor) {
    final assets = CampusData.indoorPanoramaAssets(floor);
    if (assets.isEmpty) {
      return const _EmptyNotice(
        'No indoor panorama is available for this floor.',
      );
    }
    final index = _indoorPanoramaIndex.clamp(0, assets.length - 1);
    return ColoredBox(
      color: const Color(0xFF101820),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Text(
              'Floor $floor · View ${index + 1} of ${assets.length} · drag and zoom to explore',
              style: const TextStyle(color: Colors.white70),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: InteractiveViewer(
              minScale: 1,
              maxScale: 5,
              child: Center(
                child: Image.asset(
                  assets[index],
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'This indoor panorama is not available.',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  OutlinedButton.icon(
                    onPressed: index == 0
                        ? null
                        : () => setState(() => _indoorPanoramaIndex--),
                    icon: const Icon(Icons.chevron_left),
                    label: const Text('Previous'),
                  ),
                  OutlinedButton.icon(
                    onPressed: index >= assets.length - 1
                        ? null
                        : () => setState(() => _indoorPanoramaIndex++),
                    icon: const Icon(Icons.chevron_right),
                    label: const Text('Next'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _searchField(String hint) {
    return TextField(
      controller: _searchController,
      focusNode: _searchFocusNode,
      onChanged: (value) => setState(() => _searchQuery = value),
      onTap: () {
        if (_selectedTab != 1) setState(() => _selectedTab = 1);
      },
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: const Icon(Icons.search),
        suffixIcon: _searchQuery.isEmpty
            ? null
            : IconButton(
                onPressed: () {
                  _searchController.clear();
                  setState(() => _searchQuery = '');
                },
                icon: const Icon(Icons.close),
                tooltip: 'Clear search',
              ),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(15),
          borderSide: const BorderSide(color: Color(0xFFE4E9F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(15),
          borderSide: const BorderSide(color: Color(0xFFE4E9F0)),
        ),
      ),
    );
  }
}

class CampusMapView extends StatelessWidget {
  const CampusMapView({
    required this.route,
    required this.userPosition,
    required this.selectedNodeId,
    required this.onPlaceTap,
    required this.onPanoramaTap,
    super.key,
  });

  final List<MapPoint>? route;
  final MapPoint? userPosition;
  final String? selectedNodeId;
  final ValueChanged<CampusPlace> onPlaceTap;
  final ValueChanged<int> onPanoramaTap;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: CampusData.imageAspect,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: LayoutBuilder(
          builder: (context, constraints) {
            return InteractiveViewer(
              minScale: 1,
              maxScale: 4,
              boundaryMargin: const EdgeInsets.all(24),
              child: SizedBox(
                width: constraints.maxWidth,
                height: constraints.maxHeight,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset(
                      'assets/images/campus-aerial.jpg.png',
                      fit: BoxFit.fill,
                    ),
                    if (route != null && route!.length > 1)
                      CustomPaint(
                        painter: _RoutePainter(
                          points: route!,
                          color: const Color(0xFF1565D8),
                        ),
                      ),
                    for (final point in CampusData.streetViewPoints)
                      Positioned(
                        left: constraints.maxWidth * point.x / 100 - 11,
                        top: constraints.maxHeight * point.y / 100 - 11,
                        child: _MapMarker(
                          icon: Icons.threesixty,
                          color: const Color(0xFF6C4CE3),
                          size: 22,
                          tooltip: 'Open campus view ${point.number}',
                          onTap: () => onPanoramaTap(point.number),
                        ),
                      ),
                    for (final place in CampusData.places)
                      if (CampusData.nodeForId(place.nodeId) case final node?)
                        Positioned(
                          left: constraints.maxWidth * node.x / 100 - 15,
                          top: constraints.maxHeight * node.y / 100 - 15,
                          child: _MapMarker(
                            icon: Icons.location_on,
                            color: const Color(0xFF123B72),
                            size: 30,
                            tooltip: place.name,
                            highlighted: selectedNodeId == node.id,
                            onTap: () => onPlaceTap(place),
                          ),
                        ),
                    if (userPosition case final location?)
                      Positioned(
                        left: constraints.maxWidth * location.x / 100 - 9,
                        top: constraints.maxHeight * location.y / 100 - 9,
                        child: Container(
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            color: const Color(0xFF1687FF),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 3),
                            boxShadow: const [
                              BoxShadow(color: Colors.black26, blurRadius: 5),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class IndoorMapView extends StatelessWidget {
  const IndoorMapView({
    required this.floor,
    required this.rooms,
    required this.selectedRoomId,
    required this.route,
    required this.onRoomTap,
    super.key,
  });

  final int floor;
  final List<IndoorRoom> rooms;
  final String? selectedRoomId;
  final List<MapPoint> route;
  final ValueChanged<IndoorRoom> onRoomTap;

  @override
  Widget build(BuildContext context) {
    final floorRooms = rooms.where((room) => room.floor == floor).toList();
    return AspectRatio(
      aspectRatio: CampusData.imageAspect,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: LayoutBuilder(
          builder: (context, constraints) {
            return InteractiveViewer(
              minScale: 1,
              maxScale: 4,
              boundaryMargin: const EdgeInsets.all(24),
              child: SizedBox(
                width: constraints.maxWidth,
                height: constraints.maxHeight,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset(
                      'assets/images/campus-aerial.jpg.png',
                      fit: BoxFit.fill,
                    ),
                    if (route.length > 1)
                      CustomPaint(
                        painter: _RoutePainter(
                          points: route,
                          color: const Color(0xFFE54242),
                          strokeWidth: 4,
                        ),
                      ),
                    for (final room in floorRooms)
                      Positioned(
                        left: constraints.maxWidth * room.rect.x / 100,
                        top: constraints.maxHeight * room.rect.y / 100,
                        width: constraints.maxWidth * room.rect.width / 100,
                        height: constraints.maxHeight * room.rect.height / 100,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => onRoomTap(room),
                          child: Container(
                            alignment: Alignment.center,
                            padding: const EdgeInsets.all(1),
                            decoration: BoxDecoration(
                              color: _roomColor(room.kind).withValues(
                                alpha: room.id == selectedRoomId ? 0.9 : 0.68,
                              ),
                              border: Border.all(
                                color: room.id == selectedRoomId
                                    ? Colors.white
                                    : Colors.white70,
                                width: room.id == selectedRoomId ? 2 : 1,
                              ),
                            ),
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                room.name,
                                maxLines: 1,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _RoutePainter extends CustomPainter {
  const _RoutePainter({
    required this.points,
    required this.color,
    this.strokeWidth = 4,
  });

  final List<MapPoint> points;
  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;
    final path = Path()
      ..moveTo(
        size.width * points.first.x / 100,
        size.height * points.first.y / 100,
      );
    for (final point in points.skip(1)) {
      path.lineTo(size.width * point.x / 100, size.height * point.y / 100);
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke,
    );
    final end = points.last;
    canvas.drawCircle(
      Offset(size.width * end.x / 100, size.height * end.y / 100),
      6,
      Paint()..color = color,
    );
  }

  @override
  bool shouldRepaint(covariant _RoutePainter oldDelegate) =>
      oldDelegate.points != points ||
      oldDelegate.color != color ||
      oldDelegate.strokeWidth != strokeWidth;
}

class _MapMarker extends StatelessWidget {
  const _MapMarker({
    required this.icon,
    required this.color,
    required this.size,
    required this.tooltip,
    required this.onTap,
    this.highlighted = false,
  });

  final IconData icon;
  final Color color;
  final double size;
  final String tooltip;
  final VoidCallback onTap;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: highlighted ? const Color(0xFFEAF2FF) : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: color, width: highlighted ? 3 : 1.5),
            boxShadow: const [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Icon(icon, color: color, size: size * 0.68),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.eyebrow,
    required this.title,
    required this.child,
    this.trailing,
  });

  final String eyebrow;
  final String title;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Eyebrow(eyebrow),
                      const SizedBox(height: 3),
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
                ?trailing,
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _PlaceDetail extends StatelessWidget {
  const _PlaceDetail({
    required this.place,
    required this.onDirections,
    required this.onOpenBuilding,
  });

  final CampusPlace place;
  final VoidCallback onDirections;
  final VoidCallback onOpenBuilding;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _Eyebrow('SELECTED AREA'),
            const SizedBox(height: 4),
            Text(
              place.name,
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(place.description),
            if (place.coordinates != null) ...[
              const SizedBox(height: 6),
              Text(
                place.coordinates!,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: onDirections,
                  icon: const Icon(Icons.directions_walk),
                  label: const Text('Get directions'),
                ),
                if (place.id == 'mst-building')
                  OutlinedButton.icon(
                    onPressed: onOpenBuilding,
                    icon: const Icon(Icons.apartment),
                    label: const Text('Building map'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ShortcutRow extends StatelessWidget {
  const _ShortcutRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: const Color(0xFFEAF0F8),
        foregroundColor: const Color(0xFF123B72),
        child: Icon(icon),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}

class _ResultTile extends StatelessWidget {
  const _ResultTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.selected = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: selected
              ? const Color(0xFFDCE9FB)
              : const Color(0xFFF0F3F7),
          foregroundColor: const Color(0xFF123B72),
          child: Icon(icon),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward),
        onTap: onTap,
      ),
    );
  }
}

class _FloorSelector extends StatelessWidget {
  const _FloorSelector({required this.selectedFloor, required this.onChanged});

  final int selectedFloor;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<int>(
      segments: List.generate(
        4,
        (index) =>
            ButtonSegment(value: index + 1, label: Text('${index + 1}F')),
      ),
      selected: {selectedFloor},
      onSelectionChanged: (selection) => onChanged(selection.first),
    );
  }
}

class _RouteStep extends StatelessWidget {
  const _RouteStep({required this.number, required this.text});

  final int number;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 13,
            backgroundColor: const Color(0xFFEAF0F8),
            foregroundColor: const Color(0xFF123B72),
            child: Text(
              '$number',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text(text),
            ),
          ),
        ],
      ),
    );
  }
}

class _Eyebrow extends StatelessWidget {
  const _Eyebrow(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
        color: const Color(0xFF68778B),
        fontWeight: FontWeight.w800,
        letterSpacing: 1.1,
      ),
    );
  }
}

class _OfflineNote extends StatelessWidget {
  const _OfflineNote();

  @override
  Widget build(BuildContext context) {
    return const _EmptyNotice(
      'Campus maps and directions work offline. GPS requires location permission.',
      icon: Icons.offline_pin_outlined,
    );
  }
}

class _EmptyNotice extends StatelessWidget {
  const _EmptyNotice(this.message, {this.icon = Icons.info_outline});

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF3F8),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: const Color(0xFF123B72)),
          const SizedBox(width: 10),
          Expanded(child: Text(message)),
        ],
      ),
    );
  }
}

IconData _roomIcon(String kind) => switch (kind) {
  'lab' => Icons.science_outlined,
  'library' => Icons.local_library_outlined,
  'clinic' => Icons.medical_services_outlined,
  'office' => Icons.business_outlined,
  'comfort-room' => Icons.wc_outlined,
  _ => Icons.meeting_room_outlined,
};

Color _roomColor(String kind) => switch (kind) {
  'office' => const Color(0xFF7A5DF0),
  'clinic' => const Color(0xFFE0559A),
  'library' => const Color(0xFFC9930A),
  'lab' => const Color(0xFF0F7F9E),
  'comfort-room' => const Color(0xFFD912A0),
  _ => const Color(0xFF2E6B5E),
};
