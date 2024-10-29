import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ApartmentIcon from '@mui/icons-material/Apartment';
import L from 'leaflet';
import {
  useGetClimbingSpotsQuery,
  useGetCurrentWeatherQuery,
  useGetForecastQuery,
} from './services/api';
import { useTranslation } from 'react-i18next';

// Fix for default icon issue in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

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

interface WeatherData {
  main: {
    temp: number;
  };
  rain?: {
    '1h'?: number;
  };
  snow?: {
    '1h'?: number;
  };
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

function App() {
  const [isForecast, setIsForecast] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>([51.1093, 17.0386]); // Wroclaw
  const [radius, setRadius] = useState(100); // default radius in km - 100 km
  const { t } = useTranslation();

  useEffect(() => {
    // get user location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("USER POSITION", position);
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

  const { data: weatherData } = useGetCurrentWeatherQuery(
    climbingSpots.length ? { lat: climbingSpots[0].lat, lon: climbingSpots[0].lon } : { lat: 0, lon: 0},
    { skip: climbingSpots.length === 0 }
  );

  const { data: forecastData } = useGetForecastQuery(
    climbingSpots.length ? { lat: climbingSpots[0].lat, lon: climbingSpots[0].lon } : { lat: 0, lon: 0},
    { skip: climbingSpots.length === 0 }
  );

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
        {climbingSpots.map((spot: ClimbingSpot, idx: number) => (
          // icon can be customized
          <Marker key={idx} position={[spot.lat, spot.lon]}>
            <Popup>
              <b>{spot.tags.name} {(spot.tags.indoor === "yes" || spot.tags.building === "yes" || spot.tags.leisure === "sports_centre") && <span>(centrum)</span>}</b>
              <br />
              {isForecast ? (
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
              ) : (
                weatherData && (
                  <>
                    {t("temperature")}: {weatherData.main.temp}°C
                    <br />
                    {t("precipitation")}: {weatherData.rain ? weatherData.rain['1h'] || 0 : weatherData.snow ? weatherData.snow['1h'] || 0 : 0} mm
                  </>
                )
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
