import 'package:flutter_test/flutter_test.dart';
import 'package:mst_guider_flutter/campus_data.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('loads the complete four-floor room directory', () async {
    final rooms = await CampusData.loadIndoorRooms();

    expect(rooms, hasLength(79));
    for (var floor = 1; floor <= 4; floor++) {
      expect(rooms.any((room) => room.floor == floor), isTrue);
    }
  });

  test('every room has a route from the MST entrance', () async {
    final rooms = await CampusData.loadIndoorRooms();

    for (final room in rooms) {
      final route = CampusData.indoorRoute(room);
      expect(route, isNotNull, reason: 'Missing route to ${room.name}');
      final floorPoints = route!.pointsForFloor(room.floor);
      expect(
        floorPoints,
        isNotEmpty,
        reason: 'Missing floor route to ${room.name}',
      );
      expect(
        floorPoints.last.x,
        closeTo(room.rect.x + room.rect.width / 2, 0.001),
      );
      expect(
        floorPoints.last.y,
        closeTo(room.rect.y + room.rect.height / 2, 0.001),
      );
    }
  });

  test('campus destinations are reachable from the main gate', () {
    for (final place in CampusData.places) {
      final route = CampusData.outdoorRouteForPlace(place.id);
      expect(route, isNotNull, reason: 'Missing route to ${place.name}');
      expect(route!.first.x, 50);
      expect(route.first.y, 93);
      final destination = CampusData.nodeForId(place.nodeId)!;
      expect(route.last.x, destination.x);
      expect(route.last.y, destination.y);
    }
  });

  test('GPS anchor projects to its calibrated image position', () {
    final point = CampusData.imagePercentFromGps(6.346511, 124.936169);

    expect(point, isNotNull);
    expect(point!.x, closeTo(50, 0.001));
    expect(point.y, closeTo(49.5, 0.001));
  });
}
