// Curated coordinates [lat, lng] for 114 Kota/Kabupaten referenced in INDONESIA_REGIONS.
export const CITY_COORDS_BY_CODE: Record<string, [number, number]> = {
  '1171': [5.5483, 95.3238], // Banda Aceh
  '1173': [5.1801, 97.1507], // Lhokseumawe
  '1174': [4.4683, 97.9683], // Langsa
  '1105': [4.1363, 96.1285], // Meulaboh
  '1271': [3.5952, 98.6722], // Medan
  '1275': [3.6001, 98.4854], // Binjai
  '1272': [2.9595, 99.0687], // Pematangsiantar
  '1207': [3.55, 98.85], // Deli Serdang
  '1371': [-0.9471, 100.4172], // Padang
  '1375': [-0.3056, 100.3692], // Bukittinggi
  '1376': [-0.2159, 100.6334], // Payakumbuh
  '1471': [0.5071, 101.4478], // Pekanbaru
  '1472': [1.6671, 101.4432], // Dumai
  '1401': [0.3344, 101.025], // Kampar
  '1571': [-1.6101, 103.6131], // Jambi
  '1572': [-2.0588, 101.3913], // Sungai Penuh
  '1505': [-1.5522, 103.8211], // Muaro Jambi
  '1671': [-2.9761, 104.7754], // Palembang
  '1673': [-3.2967, 102.8617], // Lubuklinggau
  '1674': [-3.4328, 104.2356], // Prabumulih
  '1771': [-3.7928, 102.2608], // Bengkulu
  '1702': [-3.467, 102.5217], // Rejang Lebong
  '1871': [-5.4292, 105.261], // Bandar Lampung
  '1872': [-5.1131, 105.3067], // Metro
  '1802': [-4.85, 105.2], // Lampung Tengah
  '1971': [-2.1316, 106.1169], // Pangkalpinang
  '1901': [-1.8556, 106.11], // Bangka
  '1902': [-2.742, 107.634], // Belitung
  '2172': [0.9186, 104.4583], // Tanjungpinang
  '2171': [1.0456, 104.0305], // Batam
  '2101': [1.0833, 104.4833], // Bintan
  '3173': [-6.1862, 106.834], // Jakarta Pusat
  '3175': [-6.1384, 106.8639], // Jakarta Utara
  '3172': [-6.225, 106.9004], // Jakarta Timur
  '3171': [-6.2615, 106.8106], // Jakarta Selatan
  '3174': [-6.1674, 106.7637], // Jakarta Barat
  '3273': [-6.9175, 107.6191], // Bandung
  '3275': [-6.2383, 106.9756], // Bekasi
  '3276': [-6.4025, 106.7942], // Depok
  '3271': [-6.5971, 106.806], // Bogor
  '3274': [-6.732, 108.5523], // Cirebon
  '3374': [-6.9667, 110.4167], // Semarang
  '3372': [-7.5755, 110.8243], // Solo
  '3371': [-7.4797, 110.2177], // Magelang
  '3302': [-7.4243, 109.2302], // Purwokerto
  '3471': [-7.7956, 110.3695], // Yogyakarta
  '3404': [-7.7156, 110.3556], // Sleman
  '3402': [-7.8886, 110.3289], // Bantul
  '3578': [-7.2575, 112.7521], // Surabaya
  '3573': [-7.9666, 112.6326], // Malang
  '3571': [-7.848, 112.0178], // Kediri
  '3577': [-7.6298, 111.5239], // Madiun
  '3673': [-6.12, 106.1503], // Serang
  '3671': [-6.1783, 106.6319], // Tangerang
  '3674': [-6.2886, 106.7179], // Tangerang Selatan
  '3672': [-6.0025, 106.0111], // Cilegon
  '5171': [-8.6705, 115.2126], // Denpasar
  '5108': [-8.112, 115.0882], // Singaraja
  '5105': [-8.5364, 115.405], // Klungkung
  '5271': [-8.5833, 116.1167], // Mataram
  '5202': [-8.705, 116.271], // Praya
  '5272': [-8.4606, 118.7267], // Bima
  '5371': [-10.1772, 123.607], // Kupang
  '5308': [-8.8432, 121.6623], // Ende
  '5307': [-8.6211, 122.2122], // Maumere
  '6171': [-0.0263, 109.3425], // Pontianak
  '6172': [0.9092, 108.9846], // Singkawang
  '6104': [-1.8325, 109.9817], // Ketapang
  '6271': [-2.2161, 113.914], // Palangka Raya
  '6202': [-2.5317, 112.9497], // Sampit
  '6201': [-2.6832, 111.6259], // Pangkalan Bun
  '6371': [-3.3186, 114.5944], // Banjarmasin
  '6372': [-3.4422, 114.8325], // Banjarbaru
  '6303': [-3.4106, 114.8475], // Martapura
  '6472': [-0.5022, 117.1536], // Samarinda
  '6471': [-1.2379, 116.8529], // Balikpapan
  '6474': [0.1324, 117.5], // Bontang
  '6501': [2.8375, 117.3653], // Tanjung Selor
  '6571': [3.3274, 117.5785], // Tarakan
  '7171': [1.4748, 124.8421], // Manado
  '7172': [1.4451, 125.1825], // Bitung
  '7173': [1.3256, 124.84], // Tomohon
  '7271': [-0.9003, 119.878], // Palu
  '7201': [-0.9516, 122.7875], // Luwuk
  '7202': [-1.3959, 120.7524], // Poso
  '7371': [-5.1477, 119.4327], // Makassar
  '7372': [-4.0135, 119.6255], // Parepare
  '7373': [-2.9925, 120.1969], // Palopo
  '7471': [-3.9985, 122.5129], // Kendari
  '7472': [-5.4667, 122.6333], // Baubau
  '7401': [-4.0489, 121.5944], // Kolaka
  '7571': [0.5435, 123.0568], // Gorontalo
  '7501': [0.6272, 122.9781], // Limboto
  '7602': [-2.6748, 118.8885], // Mamuju
  '7605': [-3.5403, 118.9707], // Majene
  '7604': [-3.4325, 119.3435], // Polewali
  '8171': [-3.6954, 128.1814], // Ambon
  '8172': [-5.6431, 132.7497], // Tual
  '8101': [-3.3067, 128.96], // Masohi
  '8279': [0.7333, 127.55], // Sofifi
  '8271': [0.7714, 127.3772], // Ternate
  '8272': [0.6833, 127.4167], // Tidore
  '9202': [-0.8615, 134.062], // Manokwari
  '9203': [-2.9264, 132.2961], // Fakfak
  '9671': [-0.8762, 131.2558], // Sorong
  '9605': [-0.2333, 130.5167], // Raja Ampat
  '9171': [-2.5337, 140.7181], // Jayapura
  '9106': [-1.1767, 136.082], // Biak
  '9301': [-8.4932, 140.4018], // Merauke
  '9304': [-5.3667, 138.2833], // Asmat
  '9401': [-3.3682, 135.5015], // Nabire
  '9404': [-4.5436, 136.8892], // Mimika
  '9501': [-4.0844, 138.9478], // Jayawijaya (Wamena)
  '9503': [-4.6, 139.4833], // Yahukimo
};

export const CITY_COORDS_BY_KEY: Record<string, [number, number]> = {
  'aceh::banda aceh': [5.5483, 95.3238],
  'aceh::lhokseumawe': [5.1801, 97.1507],
  'aceh::langsa': [4.4683, 97.9683],
  'aceh::meulaboh': [4.1363, 96.1285],
  'sumatera utara::medan': [3.5952, 98.6722],
  'sumatera utara::binjai': [3.6001, 98.4854],
  'sumatera utara::pematangsiantar': [2.9595, 99.0687],
  'sumatera utara::deli serdang': [3.55, 98.85],
  'sumatera barat::padang': [-0.9471, 100.4172],
  'sumatera barat::bukittinggi': [-0.3056, 100.3692],
  'sumatera barat::payakumbuh': [-0.2159, 100.6334],
  'riau::pekanbaru': [0.5071, 101.4478],
  'riau::dumai': [1.6671, 101.4432],
  'riau::kampar': [0.3344, 101.025],
  'jambi::jambi': [-1.6101, 103.6131],
  'jambi::sungai penuh': [-2.0588, 101.3913],
  'jambi::muaro jambi': [-1.5522, 103.8211],
  'sumatera selatan::palembang': [-2.9761, 104.7754],
  'sumatera selatan::lubuklinggau': [-3.2967, 102.8617],
  'sumatera selatan::prabumulih': [-3.4328, 104.2356],
  'bengkulu::bengkulu': [-3.7928, 102.2608],
  'bengkulu::rejang lebong': [-3.467, 102.5217],
  'lampung::bandar lampung': [-5.4292, 105.261],
  'lampung::metro': [-5.1131, 105.3067],
  'lampung::lampung tengah': [-4.85, 105.2],
  'bangka belitung::pangkalpinang': [-2.1316, 106.1169],
  'bangka belitung::bangka': [-1.8556, 106.11],
  'bangka belitung::belitung': [-2.742, 107.634],
  'kepulauan riau::tanjungpinang': [0.9186, 104.4583],
  'kepulauan riau::batam': [1.0456, 104.0305],
  'kepulauan riau::bintan': [1.0833, 104.4833],
  'dki jakarta::jakarta pusat': [-6.1862, 106.834],
  'dki jakarta::jakarta utara': [-6.1384, 106.8639],
  'dki jakarta::jakarta timur': [-6.225, 106.9004],
  'dki jakarta::jakarta selatan': [-6.2615, 106.8106],
  'dki jakarta::jakarta barat': [-6.1674, 106.7637],
  'jawa barat::bandung': [-6.9175, 107.6191],
  'jawa barat::bekasi': [-6.2383, 106.9756],
  'jawa barat::depok': [-6.4025, 106.7942],
  'jawa barat::bogor': [-6.5971, 106.806],
  'jawa barat::cirebon': [-6.732, 108.5523],
  'jawa tengah::semarang': [-6.9667, 110.4167],
  'jawa tengah::solo': [-7.5755, 110.8243],
  'jawa tengah::magelang': [-7.4797, 110.2177],
  'jawa tengah::purwokerto': [-7.4243, 109.2302],
  'di yogyakarta::yogyakarta': [-7.7956, 110.3695],
  'di yogyakarta::sleman': [-7.7156, 110.3556],
  'di yogyakarta::bantul': [-7.8886, 110.3289],
  'jawa timur::surabaya': [-7.2575, 112.7521],
  'jawa timur::malang': [-7.9666, 112.6326],
  'jawa timur::kediri': [-7.848, 112.0178],
  'jawa timur::madiun': [-7.6298, 111.5239],
  'banten::serang': [-6.12, 106.1503],
  'banten::tangerang': [-6.1783, 106.6319],
  'banten::tangerang selatan': [-6.2886, 106.7179],
  'banten::cilegon': [-6.0025, 106.0111],
  'bali::denpasar': [-8.6705, 115.2126],
  'bali::singaraja': [-8.112, 115.0882],
  'bali::klungkung': [-8.5364, 115.405],
  'nusa tenggara barat::mataram': [-8.5833, 116.1167],
  'nusa tenggara barat::praya': [-8.705, 116.271],
  'nusa tenggara barat::bima': [-8.4606, 118.7267],
  'nusa tenggara timur::kupang': [-10.1772, 123.607],
  'nusa tenggara timur::ende': [-8.8432, 121.6623],
  'nusa tenggara timur::maumere': [-8.6211, 122.2122],
  'kalimantan barat::pontianak': [-0.0263, 109.3425],
  'kalimantan barat::singkawang': [0.9092, 108.9846],
  'kalimantan barat::ketapang': [-1.8325, 109.9817],
  'kalimantan tengah::palangka raya': [-2.2161, 113.914],
  'kalimantan tengah::sampit': [-2.5317, 112.9497],
  'kalimantan tengah::pangkalan bun': [-2.6832, 111.6259],
  'kalimantan selatan::banjarmasin': [-3.3186, 114.5944],
  'kalimantan selatan::banjarbaru': [-3.4422, 114.8325],
  'kalimantan selatan::martapura': [-3.4106, 114.8475],
  'kalimantan timur::samarinda': [-0.5022, 117.1536],
  'kalimantan timur::balikpapan': [-1.2379, 116.8529],
  'kalimantan timur::bontang': [0.1324, 117.5],
  'kalimantan utara::tanjung selor': [2.8375, 117.3653],
  'kalimantan utara::tarakan': [3.3274, 117.5785],
  'sulawesi utara::manado': [1.4748, 124.8421],
  'sulawesi utara::bitung': [1.4451, 125.1825],
  'sulawesi utara::tomohon': [1.3256, 124.84],
  'sulawesi tengah::palu': [-0.9003, 119.878],
  'sulawesi tengah::luwuk': [-0.9516, 122.7875],
  'sulawesi tengah::poso': [-1.3959, 120.7524],
  'sulawesi selatan::makassar': [-5.1477, 119.4327],
  'sulawesi selatan::parepare': [-4.0135, 119.6255],
  'sulawesi selatan::palopo': [-2.9925, 120.1969],
  'sulawesi tenggara::kendari': [-3.9985, 122.5129],
  'sulawesi tenggara::baubau': [-5.4667, 122.6333],
  'sulawesi tenggara::kolaka': [-4.0489, 121.5944],
  'gorontalo::gorontalo': [0.5435, 123.0568],
  'gorontalo::limboto': [0.6272, 122.9781],
  'sulawesi barat::mamuju': [-2.6748, 118.8885],
  'sulawesi barat::majene': [-3.5403, 118.9707],
  'sulawesi barat::polewali': [-3.4325, 119.3435],
  'maluku::ambon': [-3.6954, 128.1814],
  'maluku::tual': [-5.6431, 132.7497],
  'maluku::masohi': [-3.3067, 128.96],
  'maluku utara::sofifi': [0.7333, 127.55],
  'maluku utara::ternate': [0.7714, 127.3772],
  'maluku utara::tidore': [0.6833, 127.4167],
  'papua barat::manokwari': [-0.8615, 134.062],
  'papua barat::fakfak': [-2.9264, 132.2961],
  'papua barat daya::sorong': [-0.8762, 131.2558],
  'papua barat daya::raja ampat': [-0.2333, 130.5167],
  'papua::jayapura': [-2.5337, 140.7181],
  'papua::biak': [-1.1767, 136.082],
  'papua selatan::merauke': [-8.4932, 140.4018],
  'papua selatan::asmat': [-5.3667, 138.2833],
  'papua tengah::nabire': [-3.3682, 135.5015],
  'papua tengah::mimika': [-4.5436, 136.8892],
  'papua pegunungan::jayawijaya (wamena)': [-4.0844, 138.9478],
  'papua pegunungan::yahukimo': [-4.6, 139.4833],
};
