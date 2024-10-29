import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { DivIcon } from 'leaflet';
// import MarkerClusterGroup from 'react-leaflet-markercluster';
// import 'react-leaflet-markercluster/dist/styles.min.css';
import {
  useGetClimbingSpotsQuery,
  useGetCurrentWeatherQuery,
  useGetForecastQuery,
} from './services/api';
import { useTranslation } from 'react-i18next';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetinaUrl,
  iconSize: [25, 41], // Adjust as needed
  iconAnchor: [13, 0]
});

interface ClimbingSpot {
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
    "climbing:bolted": string; // "yes"
    "climbing:mixed": string; // "yes"
    "climbing:rock": string; // "limestone", "sandstone", "granite", "gneiss"
    "climbing:sport": string; // "yes"
    "climbing:trad": string; // "yes"
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
  }
}

interface ForecastEntry {
  dt_txt: string;
  main: {
    temp: number;
  };
  rain?: {
    '3h'?: number;
  };
  snow?: {
    '3h'?: number;
  };
}

const weatherAPIKey = 'f1f10124d8835f9f53a99e0425ea5f60'; // config

const groupSpotsIntoClusters = (spots: ClimbingSpot[], distanceThreshold: number) => {
  // Function to calculate distance between two points
  const calculateDistance = (point1: {lat: any, lon: any}, point2: { lat: any; lon: any; }) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lon - point1.lon) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const clusters: { centralPoint: { lat: any, lon: any }; members: ClimbingSpot[]; }[] = [];

  spots.forEach((spot: ClimbingSpot) => {
    let addedToCluster = false;

    for (let cluster of clusters) {
      const { centralPoint, members } = cluster;
      const distance = calculateDistance(centralPoint, spot);

      if (distance <= distanceThreshold) {
        members.push(spot);
        cluster.centralPoint = {
          lat: (centralPoint.lat * members.length + spot.lat) / (members.length + 1),
          lon: (centralPoint.lon * members.length + spot.lon) / (members.length + 1),
        };
        addedToCluster = true;
        break;
      }
    }

    if (!addedToCluster) {
      clusters.push({
        centralPoint: { lat: spot.lat, lon: spot.lon },
        members: [spot],
      });
    }
  });

  return clusters;
};

const ClusterMarker = ({ cluster }: any) => {
  // Extract central point coordinates from the cluster
  const { centralPoint } = cluster;
  console.log("CENTRAL POINT", centralPoint);

  // Fetch weather data for the cluster’s central point
  const { data } = useGetCurrentWeatherQuery({
    lat: centralPoint.lat,
    lon: centralPoint.lon,
  });

  console.log("CP DATA", data);

  if (!data || !data.weather || !data.main) return null;

  const iconUrl = data.weather[0].icon
    ? `http://openweathermap.org/img/wn/${data.weather[0].icon}.png`
    : null;

  const temperature = `${data.main.temp}°C`;

  const iconHtml = `
    <div style="display: flex; align-items: center;">
      <img src="${iconUrl}" alt="weather icon" style="width: 50px; height: 50px;" />
      <span style="text-shadow: 1px 1px 1px #fff, -1px 1px 1px #fff, -1px -1px 1px #fff, 1px -1px 1px #fff">${temperature}</span>
    </div>
  `;

  const weatherIcon: DivIcon = iconUrl ? new L.DivIcon({
    html: iconHtml,
    className: '',
    iconSize: [60, 60], // Adjust as needed
    iconAnchor: [30, 30]
  }) : DefaultIcon;

  return (
    <Marker position={[centralPoint.lat, centralPoint.lon]} icon={weatherIcon}>
<Popup>
        <b>Cluster Weather</b>
        <br />
        Temperature: {temperature}
      </Popup>
    </Marker>
  );
};

function App() {
  const [isForecast, setIsForecast] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>([51.1093, 17.0386]); // Wroclaw
  const [radius, setRadius] = useState(100); // default radius in km - 100 km
  const { t } = useTranslation();

  useEffect(() => {
    // get user location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        //console.log("USER POSITION", position);
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
      },
      (error) => {
        console.error('Error getting user location:', error);
      }
    );
  }, []);

  const { data: climbingSpots = [], refetch: refetchSpots } = useGetClimbingSpotsQuery({
    radius: radius * 1000,
    lat: userLocation[0],
    lon: userLocation[1],
  });

  // group climbing spots into clusters based on distance
  const distanceThreshold = 10; // in kilometers
  const clusters = groupSpotsIntoClusters(climbingSpots, distanceThreshold);
  console.log("CLUSTERS", clusters);

  const { data: weatherData } = useGetCurrentWeatherQuery(
    climbingSpots.length ? { lat: climbingSpots[0].lat, lon: climbingSpots[0].lon } : { lat: 0, lon: 0},
    { skip: climbingSpots.length === 0 }
  );

  console.log("DATA", weatherData);

  // const { data: forecastData } = useGetForecastQuery(
  //   climbingSpots.length ? { lat: climbingSpots[0].lat, lon: climbingSpots[0].lon } : { lat: 0, lon: 0},
  //   { skip: climbingSpots.length === 0 }
  // );

  return (
    <div className="App">
      <h1>{t("climbing_map")}</h1>
      <div>
        <label>
          {t("radius")} ({t("kilometers")}):
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ marginLeft: '10px', marginRight: '10px' }}
          />
        </label>
        <button onClick={() => setIsForecast(false)}>{t("current_weather")}</button>
        <button onClick={() => setIsForecast(true)}>{t("forecast")}</button>
      </div>
      <MapContainer center={userLocation} zoom={10} style={{ height: '600px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <TileLayer
          url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${weatherAPIKey}`}
        />
        {/* <TileLayer
          url={`https://maps.openweathermap.org/maps/2.0/weather/1h/HRD0/4/1/6?date=1618898990&appid=${weatherAPIKey}`}
          /> */}
          {/* // @ts-ignore  */}
          {/* <MarkerClusterGroup> */}

          {/* the idea: use this loop to display dots with object names, the other loop for weather (clustered) */}
        {climbingSpots.map((spot: ClimbingSpot, idx: number) => {

          // const currentWeatherData = weatherData ? weatherData[idx] : null; // Get corresponding weather data

          // if (!currentWeatherData) return null;

          // const iconUrl = currentWeatherData.weather[0].icon
          //   ? `http://openweathermap.org/img/wn/${currentWeatherData.weather[0].icon}.png`
          //   : null;

          // const temperature = `${currentWeatherData.main.temp}°C`;

          // const iconHtml = `
          //   <div style="display: flex; align-items: center;">
          //     <img src="${iconUrl}" alt="weather icon" style="width: 50px; height: 50px;" />
          //     <span style="margin-left: 5px;">${temperature}</span>
          //   </div>
          // `;

          // const weatherIcon: DivIcon = iconUrl ? new L.DivIcon({
          //   html: iconHtml,
          //   className: '',
          //   iconSize: [60, 60], // Adjust as needed
          //   iconAnchor: [30, 30]
          // }) : DefaultIcon;

          return (
          <Marker key={idx} position={[spot.lat, spot.lon]} icon={DefaultIcon}>
            <Popup>
              <b>{spot.tags.name} {(spot.tags.indoor === "yes" || spot.tags.building === "yes" || spot.tags.leisure === "sports_centre") && <span>(centrum)</span>}</b>
              <br />
              {/* {isForecast ? (
                forecastData && forecastData.list && forecastData.list.slice(0, 5).map((forecast: ForecastEntry, index: number) => (
                  <div key={index}>
                    <b>{forecast.dt_txt}</b>
                    <br />
                    {t("temperature")}: {forecast.main.temp}°C
                    <br />
                    {t("precipitation")}: {forecast.rain ? forecast.rain['3h'] || 0 : forecast.snow ? forecast.snow['3h'] || 0 : 0} mm
                    <br />
                  </div>
                ))
              ) : ( */}
                {/* currentWeatherData && (
                  <>
                    {t("temperature")}: {currentWeatherData.main.temp}°C
                    <br />
                    {t("precipitation")}: {currentWeatherData.rain ? currentWeatherData.rain['1h'] || 0 : currentWeatherData.snow ? currentWeatherData.snow['1h'] || 0 : 0} mm
                  </>
                ) */}
              {/* )} */}
            </Popup>
          </Marker>
          );
        })}

        {clusters.map((cluster, idx) => (
          <ClusterMarker key={idx} cluster={cluster} />
        ))}

        {/* </MarkerClusterGroup> */}
      </MapContainer>
    </div>
  );
}

export default App;
