import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  useGetClimbingSpotsQuery,
  useGetCurrentWeatherQuery,
  useGetForecastQuery,
} from './services/api';

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
    "climbing": string;
    "description": string;
    "email": string;
    "fee": string; // "yes"
    "indoor": string; // "yes"
    "leisure": string; // "sports_centre",
    "name": string; // "Climbing Spot",
    "opening_hours": string; // "Mo-Fr 09:00-24:00; Sa-Su 08:00-23:00",
    "phone": string; // "+48 61 250 24 80",
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

function App() {
  const [isForecast, setIsForecast] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>([51.1093, 17.0386]); // Wroclaw
  const [radius, setRadius] = useState(150 * 1000); // Default radius in meters - 100 km

  useEffect(() => {
    // Get user location
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

  const { data: climbingSpots = [], refetch: refetchSpots } = useGetClimbingSpotsQuery({
    radius,
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
      <h1>Climbing Spots</h1>
      <div>
        <label>
          Radius (meters):
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ marginLeft: '10px', marginRight: '10px' }}
          />
        </label>
        <button onClick={() => setIsForecast(false)}>Current Weather</button>
        <button onClick={() => setIsForecast(true)}>Forecast</button>
      </div>
      <MapContainer center={userLocation} zoom={10} style={{ height: '600px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {climbingSpots.map((spot: ClimbingSpot, idx: number) => (
          <Marker key={idx} position={[spot.lat, spot.lon]}>
            <Popup>
              <b>{spot.tags.name} {spot.tags.indoor === "yes" && <span>(indoor)</span>}</b>
              <br />
              {isForecast ? (
                forecastData && forecastData.list && forecastData.list.slice(0, 5).map((forecast: ForecastEntry, index: number) => (
                  <div key={index}>
                    <b>{forecast.dt_txt}</b>
                    <br />
                    Temperature: {forecast.main.temp}°C
                    <br />
                    Precipitation: {forecast.rain ? forecast.rain['3h'] || 0 : forecast.snow ? forecast.snow['3h'] || 0 : 0} mm
                    <br />
                  </div>
                ))
              ) : (
                weatherData && (
                  <>
                    Temperature: {weatherData.main.temp}°C
                    <br />
                    Precipitation: {weatherData.rain ? weatherData.rain['1h'] || 0 : weatherData.snow ? weatherData.snow['1h'] || 0 : 0} mm
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
