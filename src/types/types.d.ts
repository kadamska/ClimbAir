
export declare interface ClimbingSpot {
  id: string;
  lat: number;
  lon: number;
  //name: string;
  tags: {
    "addr:city": string;
    "addr:city:simc": string;
    "addr:housenumber": string;
    "addr:postcode": string;
    "addr:street": string;
    "building": string; // "yes"
    "climbing": string;
    "climbing:boulder": string;
    "climbing:bolted": string; // "yes"
    "climbing:mixed": string; // "yes"
    "climbing:rock": string; // "limestone", "sandstone", "granite", "gneiss"
    "climbing:sport": string; // "yes"
    "climbing:trad": string; // "yes"
    "climbing:grade:french:max": string;
    "climbing:grade:french:min": string;
    "climbing:routes": string; // liczba dróg, e.g. "34"
    "description": string;
    "email": string;
    "facebook": string; // "https://www.facebook.com/flow.climbingspace"
    "fee": string; // "yes"
    "height": string; // "15" (meters)
    "indoor": string; // "yes"
    "leisure": string; // "sports_centre",
    "name": string; // "Climbing Spot",
    "opening_hours": string; // "Mo-Fr 09:00-24:00; Sa-Su 08:00-23:00",
    "phone": string; // "+48 61 250 24 80",
    "rock": string; // "gneiss"
    "source:addr": string; // "EMUiA (emuia.geoportal.gov.pl)",
    "sport": string; // "climbing",
    "website": string; // "https://www.climbingspot.pl/"
    "url": string; // e.g. link do topo
  },
  type: string; // "way"
};

export declare interface LatLonTuple {
  lat: number;
  lon: number;
};

export declare interface Cluster {
  centralPoint: LatLonTuple;
  members: Array<ClimbingSpot>;
};