// Location data for the Philippines
export interface Location {
  name: string;
  cities?: City[];
}

export interface City {
  name: string;
  barangays: string[];
}

export const philippineLocations: Location[] = [
  {
    name: "Lanao del Sur",
    cities: [
      {
        name: "Marawi City",
        barangays: [
            "Ambolong",
            "Bacolod Chico Proper",
            "Banga",
            "Bangco",
            "Banggolo Poblacion",
            "Bangon",
            "Beyaba-Damag",
            "Bito Buadi Itowa",
            "Bito Buadi Parba",
            "Bubonga Pagalamatan",
            "Bubonga Lilod Madaya",
            "Boganga",
            "Boto Ambolong",
            "Bubonga Cadayonan",
            "Bubong Lumbac",
            "Bubonga Marawi",
            "Bubonga Punod",
            "Cabasaran",
            "Cabingan",
            "Cadayonan",
            "Cadayonan I",
            "Calocan East",
            "Calocan West",
            "Kormatan Matampay",
            "Daguduban",
            "Dansalan",
            "Datu Sa Dansalan",
            "Dayawan",
            "Dimaluna",
            "Dulay",
            "Dulay West",
            "East Basak",
            "Emie Punud",
            "Fort",
            "Gadongan",
            "Buadi Sacayo",
            "Guimba",
            "Kapantaran",
            "Kilala",
            "Lilod Madaya",
            "Lilod Saduc",
            "Lomidong",
            "Lumbaca Madaya",
            "Lumbac Marinaut",
            "Lumbaca Toros",
            "Malimono",
            "Basak Malutlut",
            "Gadongan Mapantao",
            "Amito Marantao",
            "Marinaut East",
            "Marinaut West",
            "Matampay",
            "Pantaon",
            "Mipaga Proper",
            "Moncado Colony",
            "Moncado Kadingilan",
            "Moriatao Loksadato",
            "Datu Naga",
            "Navarro",
            "Olawa Ambolong",
            "Pagalamatan Gambai",
            "Pagayawan",
            "Panggao Saduc",
            "Papandayan",
            "Paridi",
            "Patani",
            "Pindolonan",
            "Poona Marantao",
            "Pugaan",
            "Rapasun MSU",
            "Raya Madaya I",
            "Raya Madaya II",
            "Raya Saduc",
            "Rorogagus Proper",
            "Rorogagus East",
            "Sabala Manao",
            "Sabala Manao Proper",
            "Saduc Proper",
            "Sagonsongan",
            "Sangcay Dansalan",
            "Somiorang",
            "South Madaya Proper",
            "Sugod Proper",
            "Tampilong",
            "Timbangalan",
            "Tuca Ambolong",
            "Tolali",
            "Toros",
            "Tuca",
            "Tuca Marinaut",
            "Tongantongan-Tuca Timbangalan",
            "Wawalayan Calocan",
            "Wawalayan Marinaut",
            "Marawi Poblacion",
            "Norhaya Village",
            "Papandayan Caniogan",
            "Boganga II",
            "Datu Dalidigan",
            "Angoyao",
            "Sultan Corobong",
            "Sultan Panoroganan"
        ]
      }
    ]
  },
  
  // Add more provinces
];

// Helper functions
export function getCitiesByProvince(provinceName: string): City[] {
  const province = philippineLocations.find(p => p.name === provinceName);
  return province?.cities || [];
}

export function getBarangaysByCity(provinceName: string, cityName: string): string[] {
  const province = philippineLocations.find(p => p.name === provinceName);
  const city = province?.cities?.find(c => c.name === cityName);
  return city?.barangays || [];
}

export function getProvinces(): string[] {
  return philippineLocations.map(p => p.name);
} 