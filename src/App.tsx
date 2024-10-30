import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  useGetClimbingSpotsQuery,
  useGetCurrentWeatherQuery,
  // useGetForecastQuery,
} from './services/api';
import { useTranslation } from 'react-i18next';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import WeatherMarker from './components/WeatherMarker';
import type { ClimbingSpot, Cluster, LatLonTuple } from './types/types';

const weatherAPIKey = 'f1f10124d8835f9f53a99e0425ea5f60'; // config

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetinaUrl,
  iconSize: [25, 41], // Adjust as needed
  iconAnchor: [13, 0]
});

// Calculate distance between two points
const calculateDistance = (point1: LatLonTuple, point2: LatLonTuple) => {
  const R = 6371; // Earth radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lon - point1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Group spots into clusters
const groupSpotsIntoClusters = (spots: ClimbingSpot[], distanceThreshold: number) => {

  const clusters: Array<Cluster> = [];

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

const isIndoor = (spot: ClimbingSpot) => {
  return spot.tags.indoor === 'yes'
    || spot.tags.building === 'yes'
    || spot.tags.leisure === 'sports_centre';
};

const IndoorDetails = ({ spot } : { spot: ClimbingSpot }) => {
  return (
    <>
      <h2>{spot.tags.name}</h2>
      <div>Ścianka wspinaczkowa</div>
      {spot.tags.description && <div>{spot.tags.description}</div>}
      {spot.tags["addr:street"] && <div>{spot.tags["addr:street"]} {spot.tags["addr:housenumber"]}</div>}
      {spot.tags["addr:city"] && <div>{spot.tags["addr:postcode"]} {spot.tags["addr:city"]}</div>}
      {spot.tags["opening_hours"] && <div>Czynne: {spot.tags["opening_hours"]}</div>}
      {spot.tags["phone"] && <div>Telefon: {spot.tags["phone"]}</div>}
      {spot.tags["website"] && <div>WWW: {spot.tags["website"]}</div>}
      {spot.tags["facebook"] && <div>FB: {spot.tags["facebook"]}</div>}
      {spot.tags["height"] && <div>Wysokość: {spot.tags["height"]}m</div>}
    </>
  );
};

const OutdoorDetails = ({ spot } : { spot: ClimbingSpot }) => {
  console.log("SPOT", spot);
  return (
    <>
      <h2>{spot.tags.name}</h2>
      {spot.tags.description && <div>{spot.tags.description}</div>}
      {spot.tags.climbing && <div>Typ wspinania: {spot.tags.climbing}</div>}
      {spot.tags["climbing:boulder"] === "yes" && <div>Bouldery</div>}
      {spot.tags["climbing:bolted"] === "yes" && <div>Drogi ubezpieczone</div>}
      {spot.tags["climbing:mixed"] === "yes" && <div>Drogi mieszane</div>}
      {spot.tags["climbing:sport"] === "yes" && <div>Drogi sportowe</div>}
      {spot.tags["climbing:trad"] === "yes" && <div>Drogi tradowe (klasyczne)</div>}
      {spot.tags["climbing:rock"] && <div>Skała: {spot.tags["climbing:rock"]}</div>}
      {spot.tags["climbing:grade:french:min"] && <div>Min. trudność: {spot.tags["climbing:grade:french:min"]}</div>}
      {spot.tags["climbing:grade:french:max"] && <div>Max. trudność: {spot.tags["climbing:grade:french:max"]}</div>}
      {spot.tags["rock"] && <div>Skała: {spot.tags["rock"]}</div>}
      {spot.tags["height"] && <div>Wysokość: {spot.tags["height"]}m</div>}
      {spot.tags["climbing:routes"] && <div>Liczba dróg: {spot.tags["climbing:routes"]}</div>}
      {spot.tags["url"] && <div>URL: {spot.tags["url"]}</div>}
    </>
  );
};

const SpotDetailsPanel = ({ spot, onClose }: { spot: ClimbingSpot; onClose: () => void }) => {

  return (
  <div style={{ padding: '10px', width: '300px', borderLeft: '1px solid grey', position: 'relative' }}>
    <button
      onClick={onClose}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'transparent',
        border: 'none',
        fontSize: '18px',
        cursor: 'pointer',
      }}
    >
      &times;
    </button>
    {isIndoor(spot) ? <IndoorDetails spot={spot} /> : <OutdoorDetails spot={spot} />}
  </div>
)};

function App() {
  const [isForecast, setIsForecast] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>([51.1093, 17.0386]); // Wroclaw
  const [radius, setRadius] = useState(100); // default radius in km - 100 km
  const [selectedSpot, setSelectedSpot] = useState<ClimbingSpot | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    // get user location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
      },
      (error) => {
        console.error('Error getting user location:', error);
      }
    );
  }, []);

  const { data: climbingSpots = [] } = useGetClimbingSpotsQuery({
    radius: radius * 1000,
    lat: userLocation[0],
    lon: userLocation[1],
  });

  // group climbing spots into clusters based on distance
  const distanceThreshold = 10; // in kilometers
  const clusters = groupSpotsIntoClusters(climbingSpots, distanceThreshold);

  const { data: weatherData } = useGetCurrentWeatherQuery(
    climbingSpots.length ? { lat: climbingSpots[0].lat, lon: climbingSpots[0].lon } : { lat: 0, lon: 0},
    { skip: climbingSpots.length === 0 }
  );

  // const { data: forecastData } = useGetForecastQuery(
  //   climbingSpots.length ? { lat: climbingSpots[0].lat, lon: climbingSpots[0].lon } : { lat: 0, lon: 0},
  //   { skip: climbingSpots.length === 0 }
  // );

  return (
    <div className="App" style={{ display: 'flex' }}>
    <div style={{ flex: '1' }}>
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

          {climbingSpots.map((spot: ClimbingSpot, idx: number) => {

          return (
          <Marker
            key={idx}
            position={[spot.lat, spot.lon]}
            icon={DefaultIcon}
            eventHandlers={{
              click: () => {
                setSelectedSpot(spot);
              },
            }}
            zIndexOffset={1000}
            >
            <Popup>
              <b>{spot.tags.name} {(spot.tags.indoor === "yes" || spot.tags.building === "yes" || spot.tags.leisure === "sports_centre") && <span>(ścianka)</span>}</b>
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

        {clusters.map((cluster: any, idx: number) => (
          <WeatherMarker key={idx} cluster={cluster} />
        ))}

      </MapContainer>
    </div>
    {selectedSpot && <SpotDetailsPanel spot={selectedSpot} onClose={() => setSelectedSpot(null)} />}
    </div>
  );
}

export default App;
