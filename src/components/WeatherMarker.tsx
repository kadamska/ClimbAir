import { Marker } from 'react-leaflet';
import L, { DivIcon } from 'leaflet';
import { useGetCurrentWeatherQuery } from '../services/api';
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

const WeatherMarker = ({ cluster } : any) => {
  const { centralPoint } = cluster;

  // fetch weather data for the central point
  const { data } = useGetCurrentWeatherQuery({
    lat: centralPoint.lat,
    lon: centralPoint.lon,
  });

  if (!data || !data.weather || !data.main) return null;

  const iconUrl = data.weather[0].icon
    ? `http://openweathermap.org/img/wn/${data.weather[0].icon}.png`
    : null;

  const temperature = `${Math.round(data.main.temp)}°C`;

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
    </Marker>
  );
};

export default WeatherMarker;