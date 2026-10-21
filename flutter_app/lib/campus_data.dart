import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/services.dart';

class MapPoint {
  const MapPoint(this.x, this.y);

  final double x;
  final double y;
}

class CampusNode {
  const CampusNode(this.id, this.name, this.x, this.y);

  final String id;
  final String name;
  final double x;
  final double y;

  MapPoint get point => MapPoint(x, y);
}

class CampusPlace {
  const CampusPlace({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.nodeId,
    this.coordinates,
  });

  final String id;
  final String name;
  final String category;
  final String description;
  final String nodeId;
  final String? coordinates;
}

class IndoorRoom {
  const IndoorRoom({
    required this.id,
    required this.name,
    required this.floor,
    required this.kind,
    required this.rect,
    required this.nodeId,
  });

  factory IndoorRoom.fromJson(Map<String, dynamic> json) {
    final rect = json['rect'] as Map<String, dynamic>;
    return IndoorRoom(
      id: json['id'] as String,
      name: json['name'] as String,
      floor: json['floor'] as int,
      kind: json['kind'] as String,
      rect: RoomRect(
        x: (rect['x'] as num).toDouble(),
        y: (rect['y'] as num).toDouble(),
        width: (rect['w'] as num).toDouble(),
        height: (rect['h'] as num).toDouble(),
      ),
      nodeId: json['nodeId'] as String,
    );
  }

  final String id;
  final String name;
  final int floor;
  final String kind;
  final RoomRect rect;
  final String nodeId;
}

class RoomRect {
  const RoomRect({
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });

  final double x;
  final double y;
  final double width;
  final double height;
}

class StreetViewPoint {
  const StreetViewPoint(this.number, this.x, this.y);

  final int number;
  final double x;
  final double y;
}

class IndoorRoute {
  const IndoorRoute(this.room, this.nodeIds);

  final IndoorRoom room;
  final List<String> nodeIds;

  List<MapPoint> pointsForFloor(int floor) {
    final points = <MapPoint>[];
    for (final nodeId in nodeIds) {
      if (_floorOf(nodeId) != floor) continue;
      final point = CampusData.hallwayPoints[nodeId];
      if (point != null) points.add(point);
    }
    if (room.floor == floor) {
      points.add(
        MapPoint(
          room.rect.x + room.rect.width / 2,
          room.rect.y + room.rect.height / 2,
        ),
      );
    }
    return points;
  }

  List<String> get steps {
    final result = <String>['Enter the building through the main entrance.'];
    var lastFloor = _floorOf(nodeIds.first);
    for (final nodeId in nodeIds.skip(1)) {
      final floor = _floorOf(nodeId);
      if (floor != lastFloor) {
        final wing = nodeId.contains('left') ? 'left-wing' : 'right-wing';
        result.add('Take the $wing stairs to floor $floor.');
        lastFloor = floor;
      }
    }
    result.add('On floor ${room.floor}, follow the hallway to ${room.name}.');
    result.add('Arrive at ${room.name}.');
    return result;
  }
}

class CampusData {
  static const imageAspect = 1414 / 793;

  static const nodes = <CampusNode>[
    CampusNode('gate', 'Main gate', 50, 93),
    CampusNode('drive-junction', 'Driveway junction', 50, 78),
    CampusNode('mst-front', 'MST Building front walk', 50, 60),
    CampusNode('mst-entrance', 'MST Building entrance', 50, 61),
    CampusNode('mst-left-wing', 'MST left wing', 36, 58),
    CampusNode('mst-right-wing', 'MST right wing', 64, 58),
    CampusNode('courtyard-top-left', 'Courtyard upper-left walkway', 9, 10),
    CampusNode('courtyard-left-upper', 'Courtyard left upper walkway', 11, 28),
    CampusNode('courtyard-left-middle', 'Courtyard left walkway', 18, 48),
    CampusNode('courtyard-left-lower', 'Courtyard left lower walkway', 31, 57),
    CampusNode('courtyard-top-middle', 'Courtyard upper walkway', 50, 10),
    CampusNode('courtyard-top-right', 'Courtyard upper-right walkway', 91, 10),
    CampusNode(
      'courtyard-right-upper',
      'Courtyard right upper walkway',
      88,
      28,
    ),
    CampusNode('courtyard-right-middle', 'Courtyard right walkway', 82, 48),
    CampusNode(
      'courtyard-right-lower',
      'Courtyard right lower walkway',
      69,
      57,
    ),
    CampusNode('field', 'Field / open area', 50, 40),
  ];

  static const places = <CampusPlace>[
    CampusPlace(
      id: 'mst-building',
      name: 'MST Building',
      category: 'Building',
      description: 'Official MST building information supplied by the project developer.',
      nodeId: 'mst-entrance',
      coordinates: '6.346549, 124.936164',
    ),
    CampusPlace(
      id: 'mst-field',
      name: 'MST Field',
      category: 'Open area / field',
      description:
          'Open field area of the SEAIT campus shown in the visual references.',
      nodeId: 'field',
    ),
  ];

  static const streetViewPoints = <StreetViewPoint>[
    StreetViewPoint(1, 56.4, 67.8),
    StreetViewPoint(2, 63.9, 64.5),
    StreetViewPoint(3, 71.4, 57.7),
    StreetViewPoint(4, 77.8, 48.9),
    StreetViewPoint(5, 82.7, 37.7),
    StreetViewPoint(6, 85.8, 25.4),
    StreetViewPoint(7, 87.3, 12),
    StreetViewPoint(8, 79.8, 9.6),
    StreetViewPoint(9, 69.7, 7.9),
    StreetViewPoint(10, 57.3, 7.7),
    StreetViewPoint(11, 47, 7.7),
    StreetViewPoint(12, 36.9, 7.9),
    StreetViewPoint(13, 26.6, 7.9),
    StreetViewPoint(14, 16.4, 7.9),
    StreetViewPoint(15, 11.3, 15.6),
    StreetViewPoint(16, 16.4, 29),
    StreetViewPoint(17, 18.7, 42.3),
    StreetViewPoint(18, 24, 53.6),
    StreetViewPoint(19, 31.4, 61.5),
    StreetViewPoint(20, 37.8, 68.6),
    StreetViewPoint(21, 50, 50),
  ];

  static const hallwayPoints = <String, MapPoint>{
    'f1-left-top': MapPoint(17.5, 40),
    'f1-left-bottom': MapPoint(17.5, 60.5),
    'f1-mid-bottom': MapPoint(46.5, 60.5),
    'f1-center-bottom': MapPoint(46.5, 64.5),
    'f1-right-bottom': MapPoint(86.5, 60.5),
    'f1-right-top': MapPoint(86.5, 40),
    'f2-left-top': MapPoint(17.5, 40),
    'f2-left-bottom': MapPoint(17.5, 60.5),
    'f2-mid-bottom': MapPoint(46.5, 60.5),
    'f2-center-bottom': MapPoint(46.5, 64.5),
    'f2-right-bottom': MapPoint(86.5, 60.5),
    'f2-right-top': MapPoint(86.5, 40),
    'f3-left-top': MapPoint(17.5, 40),
    'f3-left-bottom': MapPoint(17.5, 60.5),
    'f3-mid-bottom': MapPoint(46.5, 60.5),
    'f3-center-bottom': MapPoint(46.5, 64.5),
    'f3-right-bottom': MapPoint(86.5, 60.5),
    'f3-right-top': MapPoint(86.5, 40),
    'f4-left-top': MapPoint(17.5, 40),
    'f4-left-bottom': MapPoint(17.5, 60.5),
    'f4-mid-bottom': MapPoint(46.5, 60.5),
    'f4-center-bottom': MapPoint(46.5, 64.5),
    'f4-right-bottom': MapPoint(86.5, 60.5),
    'f4-right-top': MapPoint(86.5, 40),
  };

  static const _campusEdges = <(String, String)>[
    ('mst-entrance', 'mst-front'),
    ('mst-front', 'field'),
    ('field', 'courtyard-top-middle'),
    ('courtyard-top-middle', 'courtyard-top-left'),
    ('courtyard-top-left', 'courtyard-left-upper'),
    ('courtyard-left-upper', 'courtyard-left-middle'),
    ('courtyard-left-middle', 'courtyard-left-lower'),
    ('courtyard-left-lower', 'mst-left-wing'),
    ('mst-left-wing', 'mst-entrance'),
    ('courtyard-top-middle', 'courtyard-top-right'),
    ('courtyard-top-right', 'courtyard-right-upper'),
    ('courtyard-right-upper', 'courtyard-right-middle'),
    ('courtyard-right-middle', 'courtyard-right-lower'),
    ('courtyard-right-lower', 'mst-right-wing'),
    ('mst-right-wing', 'mst-entrance'),
    ('gate', 'drive-junction'),
    ('drive-junction', 'mst-front'),
  ];

  static Future<List<IndoorRoom>> loadIndoorRooms() async {
    final jsonText = await rootBundle.loadString(
      'assets/data/indoor_rooms.json',
    );
    final jsonList = jsonDecode(jsonText) as List<dynamic>;
    return jsonList
        .map((item) => IndoorRoom.fromJson(item as Map<String, dynamic>))
        .toList(growable: false);
  }

  static CampusNode? nodeForId(String id) {
    for (final node in nodes) {
      if (node.id == id) return node;
    }
    return null;
  }

  static CampusPlace? placeById(String? id) {
    if (id == null) return null;
    for (final place in places) {
      if (place.id == id) return place;
    }
    return null;
  }

  static List<MapPoint>? outdoorRouteForPlace(String placeId) {
    final place = placeById(placeId);
    if (place == null) return null;
    final path = _findPath(
      _buildGraph(_campusEdges, _nodePoints),
      'gate',
      place.nodeId,
    );
    if (path == null) return null;
    return path.map((id) => _nodePoints[id]!).toList(growable: false);
  }

  static IndoorRoute? indoorRoute(IndoorRoom room) {
    final graph = <String, List<_Edge>>{};
    void connect(String a, String b, {double? weight}) {
      final first = hallwayPoints[a];
      final second = hallwayPoints[b];
      if (first == null || second == null) return;
      final distance =
          weight ??
          math.sqrt(
            math.pow((first.x - second.x) * imageAspect, 2) +
                math.pow(first.y - second.y, 2),
          );
      graph.putIfAbsent(a, () => []).add(_Edge(b, distance));
      graph.putIfAbsent(b, () => []).add(_Edge(a, distance));
    }

    for (var floor = 1; floor <= 4; floor++) {
      final prefix = 'f$floor-';
      connect('${prefix}left-top', '${prefix}left-bottom');
      connect('${prefix}left-bottom', '${prefix}mid-bottom');
      connect('${prefix}mid-bottom', '${prefix}center-bottom');
      connect('${prefix}mid-bottom', '${prefix}right-bottom');
      connect('${prefix}right-bottom', '${prefix}right-top');
    }
    for (var floor = 1; floor < 4; floor++) {
      connect('f$floor-left-top', 'f${floor + 1}-left-top', weight: 12);
      connect('f$floor-right-top', 'f${floor + 1}-right-top', weight: 12);
    }

    final path = _findPath(graph, 'f1-center-bottom', room.nodeId);
    if (path == null) return null;
    return IndoorRoute(room, path);
  }

  static String outdoorPanoramaAsset(int point) {
    if (point == 21) return 'assets/panoramas/point-21.jpg';
    return 'assets/panoramas/point-$point-360.jpg';
  }

  static List<String> indoorPanoramaAssets(int floor) {
    if (floor == 1) {
      return const [
        'indoor-panoscapture-05.pg.jpg',
        'indoor-panoscapture-06.jpg.jpg',
        'indoor-panoscapture-08.jpg.jpg',
        'indoor-panoscapture-09.jpg.jpg',
        'indoor-panoscapture-10.jpg.jpg',
        'indoor-panoscapture-12.jpg.jpg',
        'indoor-panoscapture-13.jpg.jpg',
        'indoor-panoscapture-14.jpg.jpg',
        'indoor-panoscapture-15.jpg.jpg',
        'indoor-panoscapture-16.jpg.jpg',
        'indoor-panoscapture-17.jpg.jpg',
        'indoor-panoscapture-18.jpg.jpg',
      ].map((name) => 'assets/indoor_panorama/$name').toList();
    }
    final captures = switch (floor) {
      2 => 18,
      3 => 16,
      4 => 15,
      _ => 0,
    };
    final suffix = floor == 4 ? '.jpg.jpg.jpg' : '.jpg.jpg';
    return List.generate(
      captures,
      (index) =>
          'assets/indoor_panorama/floor-$floor-capture-${(index + 1).toString().padLeft(2, '0')}$suffix',
      growable: false,
    );
  }

  static MapPoint? imagePercentFromGps(double latitude, double longitude) {
    const anchorLatitude = 6.346511;
    const anchorLongitude = 124.936169;
    const anchorAImageX = 50.0;
    const anchorAImageY = 49.5;
    const anchorBLatitude = 6.346240;
    const anchorBImageY = 93.0;
    const rotationRadians = 1.5 * math.pi / 180;
    const earthRadius = 6371000.0;
    const degreesToRadians = math.pi / 180;
    const northScale = 111132.0;
    const eastScale = 111320.0 * 0.9939;

    final deltaA = (anchorBLatitude - anchorLatitude) * degreesToRadians;
    final gpsDistance = earthRadius * deltaA.abs();
    final imageDistance = anchorBImageY - anchorAImageY;
    final metersPerImagePercent = gpsDistance / imageDistance;
    if (metersPerImagePercent <= 0) return null;

    final east = (longitude - anchorLongitude) * eastScale;
    final north = (latitude - anchorLatitude) * northScale;
    final rotatedEast =
        east * math.cos(-rotationRadians) - north * math.sin(-rotationRadians);
    final rotatedNorth =
        east * math.sin(-rotationRadians) + north * math.cos(-rotationRadians);
    final x = anchorAImageX + rotatedEast / metersPerImagePercent / imageAspect;
    final y = anchorAImageY - rotatedNorth / metersPerImagePercent;
    return MapPoint(x, y);
  }

  static bool isInsideCampus(double latitude, double longitude) {
    const boundary = <(double, double)>[
      (6.34717778, 124.93596389),
      (6.34635, 124.93680278),
      (6.34592222, 124.93636944),
      (6.34678611, 124.93561944),
    ];
    var inside = false;
    for (var i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
      final (latI, lngI) = boundary[i];
      final (latJ, lngJ) = boundary[j];
      final intersects =
          (lngI > longitude) != (lngJ > longitude) &&
          latitude < (latJ - latI) * (longitude - lngI) / (lngJ - lngI) + latI;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  static final Map<String, MapPoint> _nodePoints = {
    for (final node in nodes) node.id: node.point,
  };

  static Map<String, List<_Edge>> _buildGraph(
    List<(String, String)> edges,
    Map<String, MapPoint> points,
  ) {
    final graph = <String, List<_Edge>>{};
    for (final (a, b) in edges) {
      final pointA = points[a];
      final pointB = points[b];
      if (pointA == null || pointB == null) continue;
      final distance = math.sqrt(
        math.pow((pointA.x - pointB.x) * imageAspect, 2) +
            math.pow(pointA.y - pointB.y, 2),
      );
      graph.putIfAbsent(a, () => []).add(_Edge(b, distance));
      graph.putIfAbsent(b, () => []).add(_Edge(a, distance));
    }
    return graph;
  }

  static List<String>? _findPath(
    Map<String, List<_Edge>> graph,
    String from,
    String to,
  ) {
    if (!graph.containsKey(from) || !graph.containsKey(to)) return null;
    final distances = <String, double>{
      for (final id in graph.keys) id: double.infinity,
    };
    final previous = <String, String>{};
    final unvisited = graph.keys.toSet();
    distances[from] = 0;

    while (unvisited.isNotEmpty) {
      String? current;
      var bestDistance = double.infinity;
      for (final id in unvisited) {
        final distance = distances[id]!;
        if (distance < bestDistance) {
          current = id;
          bestDistance = distance;
        }
      }
      if (current == null) break;
      if (current == to) break;
      unvisited.remove(current);
      for (final edge in graph[current]!) {
        if (!unvisited.contains(edge.to)) continue;
        final candidate = bestDistance + edge.distance;
        if (candidate < distances[edge.to]!) {
          distances[edge.to] = candidate;
          previous[edge.to] = current;
        }
      }
    }
    if (!distances[to]!.isFinite) return null;

    final path = <String>[to];
    while (path.first != from) {
      final parent = previous[path.first];
      if (parent == null) return null;
      path.insert(0, parent);
    }
    return path;
  }
}

int _floorOf(String nodeId) {
  final dashIndex = nodeId.indexOf('-');
  return int.parse(nodeId.substring(1, dashIndex));
}

class _Edge {
  const _Edge(this.to, this.distance);

  final String to;
  final double distance;
}
