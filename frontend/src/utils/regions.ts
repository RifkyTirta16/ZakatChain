import { CITY_COORDS_BY_CODE, CITY_COORDS_BY_KEY } from './cityCoords';

export const INDONESIA_REGIONS = {
  Aceh: ['Banda Aceh', 'Lhokseumawe', 'Langsa', 'Meulaboh'],
  'Sumatera Utara': ['Medan', 'Binjai', 'Pematangsiantar', 'Deli Serdang'],
  'Sumatera Barat': ['Padang', 'Bukittinggi', 'Payakumbuh'],
  Riau: ['Pekanbaru', 'Dumai', 'Kampar'],
  Jambi: ['Jambi', 'Sungai Penuh', 'Muaro Jambi'],
  'Sumatera Selatan': ['Palembang', 'Lubuklinggau', 'Prabumulih'],
  Bengkulu: ['Bengkulu', 'Rejang Lebong'],
  Lampung: ['Bandar Lampung', 'Metro', 'Lampung Tengah'],
  'Bangka Belitung': ['Pangkalpinang', 'Bangka', 'Belitung'],
  'Kepulauan Riau': ['Tanjungpinang', 'Batam', 'Bintan'],
  'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Timur', 'Jakarta Selatan', 'Jakarta Barat'],
  'Jawa Barat': ['Bandung', 'Bekasi', 'Depok', 'Bogor', 'Cirebon'],
  'Jawa Tengah': ['Semarang', 'Solo', 'Magelang', 'Purwokerto'],
  'DI Yogyakarta': ['Yogyakarta', 'Sleman', 'Bantul'],
  'Jawa Timur': ['Surabaya', 'Malang', 'Kediri', 'Madiun'],
  Banten: ['Serang', 'Tangerang', 'Tangerang Selatan', 'Cilegon'],
  Bali: ['Denpasar', 'Singaraja', 'Klungkung'],
  'Nusa Tenggara Barat': ['Mataram', 'Praya', 'Bima'],
  'Nusa Tenggara Timur': ['Kupang', 'Ende', 'Maumere'],
  'Kalimantan Barat': ['Pontianak', 'Singkawang', 'Ketapang'],
  'Kalimantan Tengah': ['Palangka Raya', 'Sampit', 'Pangkalan Bun'],
  'Kalimantan Selatan': ['Banjarmasin', 'Banjarbaru', 'Martapura'],
  'Kalimantan Timur': ['Samarinda', 'Balikpapan', 'Bontang'],
  'Kalimantan Utara': ['Tanjung Selor', 'Tarakan'],
  'Sulawesi Utara': ['Manado', 'Bitung', 'Tomohon'],
  'Sulawesi Tengah': ['Palu', 'Luwuk', 'Poso'],
  'Sulawesi Selatan': ['Makassar', 'Parepare', 'Palopo'],
  'Sulawesi Tenggara': ['Kendari', 'Baubau', 'Kolaka'],
  Gorontalo: ['Gorontalo', 'Limboto'],
  'Sulawesi Barat': ['Mamuju', 'Majene', 'Polewali'],
  Maluku: ['Ambon', 'Tual', 'Masohi'],
  'Maluku Utara': ['Sofifi', 'Ternate', 'Tidore'],
  'Papua Barat': ['Manokwari', 'Fakfak'],
  'Papua Barat Daya': ['Sorong', 'Raja Ampat'],
  Papua: ['Jayapura', 'Biak'],
  'Papua Selatan': ['Merauke', 'Asmat'],
  'Papua Tengah': ['Nabire', 'Mimika'],
  'Papua Pegunungan': ['Jayawijaya (Wamena)', 'Yahukimo'],
} as const;

export const PROVINCE_COORDS_BY_CODE: Record<string, [number, number]> = {
  '11': [4.6951, 96.7494],
  '12': [2.1154, 99.5451],
  '13': [-0.7399, 100.8],
  '14': [0.2933, 101.7068],
  '15': [-1.6101, 103.6131],
  '16': [-3.3194, 103.9144],
  '17': [-3.7928, 102.2608],
  '18': [-4.5586, 105.4068],
  '19': [-2.7411, 106.4406],
  '21': [0.9186, 104.4583],
  '31': [-6.2088, 106.8456],
  '32': [-6.9147, 107.6098],
  '33': [-7.151, 110.1403],
  '34': [-7.7956, 110.3695],
  '35': [-7.5361, 112.2384],
  '36': [-6.4058, 106.064],
  '51': [-8.4095, 115.1889],
  '52': [-8.6529, 117.3616],
  '53': [-8.6574, 121.0794],
  '61': [-0.2788, 111.4753],
  '62': [-1.6815, 113.3824],
  '63': [-3.0926, 115.2838],
  '64': [0.5387, 116.4194],
  '65': [3.0731, 116.0414],
  '71': [0.6247, 123.975],
  '72': [-1.43, 121.4456],
  '73': [-3.6688, 119.9741],
  '74': [-4.1449, 122.1746],
  '75': [0.6999, 122.4467],
  '76': [-2.8442, 119.2321],
  '81': [-3.2385, 130.1453],
  '82': [1.5709, 127.8088],
  '91': [-2.5916, 140.669],
  '92': [-1.3361, 133.1747],
  '93': [-7.7689, 139.6606],
  '94': [-3.3682, 135.5015],
  '95': [-4.0844, 138.9478],
  '96': [-0.8762, 131.2558],
};

const CODE_BY_NAME: Record<string, string> = {
  aceh: '11',
  'sumatera utara': '12',
  'sumatera barat': '13',
  riau: '14',
  jambi: '15',
  'sumatera selatan': '16',
  bengkulu: '17',
  lampung: '18',
  'bangka belitung': '19',
  'kepulauan riau': '21',
  'dki jakarta': '31',
  jakarta: '31',
  'jawa barat': '32',
  'jawa tengah': '33',
  'di yogyakarta': '34',
  yogyakarta: '34',
  'jawa timur': '35',
  banten: '36',
  bali: '51',
  'nusa tenggara barat': '52',
  ntb: '52',
  'nusa tenggara timur': '53',
  ntt: '53',
  'kalimantan barat': '61',
  'kalimantan tengah': '62',
  'kalimantan selatan': '63',
  'kalimantan timur': '64',
  'kalimantan utara': '65',
  'sulawesi utara': '71',
  'sulawesi tengah': '72',
  'sulawesi selatan': '73',
  'sulawesi tenggara': '74',
  gorontalo: '75',
  'sulawesi barat': '76',
  maluku: '81',
  'maluku utara': '82',
  papua: '91',
  'papua barat': '92',
  'papua selatan': '93',
  'papua tengah': '94',
  'papua pegunungan': '95',
  'papua barat daya': '96',
};

export const getProvinceCoords = (
  regionCode?: string | null,
  regionName?: string | null
): [number, number] | null => {
  if (regionCode && PROVINCE_COORDS_BY_CODE[regionCode.trim()]) {
    return PROVINCE_COORDS_BY_CODE[regionCode.trim()];
  }
  const norm = regionName?.trim().toLowerCase();
  if (norm && CODE_BY_NAME[norm]) {
    return PROVINCE_COORDS_BY_CODE[CODE_BY_NAME[norm]];
  }
  return null;
};

export const getRegionCoords = (
  regionCode?: string | null,
  regionName?: string | null,
  provinceName?: string | null,
  level?: string | null
): [number, number] | null => {
  const code = regionCode?.trim();
  if (code && CITY_COORDS_BY_CODE[code]) {
    return CITY_COORDS_BY_CODE[code];
  }
  if (level === 'Kota/Kabupaten' && regionName && provinceName) {
    const key = `${provinceName.trim().toLowerCase()}::${regionName.trim().toLowerCase()}`;
    if (CITY_COORDS_BY_KEY[key]) return CITY_COORDS_BY_KEY[key];
  }
  return getProvinceCoords(regionCode, regionName ?? provinceName) ?? getProvinceCoords(undefined, provinceName);
};

export { CITY_COORDS_BY_CODE, CITY_COORDS_BY_KEY };
