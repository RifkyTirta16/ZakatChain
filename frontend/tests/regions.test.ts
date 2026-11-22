import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_COORDS_BY_CODE,
  getProvinceCoords,
  getRegionCoords,
  INDONESIA_REGIONS,
  PROVINCE_COORDS_BY_CODE,
} from '../src/utils/regions';

test('INDONESIA_REGIONS defines all 38 provinces with at least 2 cities each', () => {
  const provinces = Object.keys(INDONESIA_REGIONS);
  assert.equal(provinces.length, 38);
  for (const prov of provinces) {
    const cities = INDONESIA_REGIONS[prov as keyof typeof INDONESIA_REGIONS];
    assert.ok(Array.isArray(cities) && cities.length >= 2, `${prov} must list cities`);
  }
});

test('all 38 provinces resolve valid coordinates inside Indonesia bounding box', () => {
  assert.equal(Object.keys(PROVINCE_COORDS_BY_CODE).length, 38);
  for (const prov of Object.keys(INDONESIA_REGIONS)) {
    const coords = getProvinceCoords(undefined, prov);
    assert.ok(coords, `Missing province coords for ${prov}`);
    const [lat, lng] = coords;
    assert.ok(lat >= -11.5 && lat <= 6.5, `Latitude out of Indonesia bounds for ${prov}: ${lat}`);
    assert.ok(lng >= 94.5 && lng <= 141.5, `Longitude out of Indonesia bounds for ${prov}: ${lng}`);
  }
});

test('all 114 cities resolve distinct coordinates via getRegionCoords', () => {
  assert.equal(Object.keys(CITY_COORDS_BY_CODE).length, 114);
  for (const [prov, cities] of Object.entries(INDONESIA_REGIONS)) {
    for (const city of cities) {
      const coords = getRegionCoords(undefined, city, prov, 'Kota/Kabupaten');
      assert.ok(coords, `Missing city coords for ${prov}::${city}`);
      const [lat, lng] = coords;
      assert.ok(lat >= -11.5 && lat <= 6.5, `Latitude out of bounds for ${city}: ${lat}`);
      assert.ok(lng >= 94.5 && lng <= 141.5, `Longitude out of bounds for ${city}: ${lng}`);
    }
  }
});
