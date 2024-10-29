import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define the API service
const weatherAPIKey = 'f1f10124d8835f9f53a99e0425ea5f60'; // config

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({}),
  tagTypes: ['Spots', 'Weather', 'Forecast'],
  endpoints: (builder) => ({
    getClimbingSpots: builder.query({
      query: ({ radius, lat, lon }: { radius: number, lat: number, lon: number }) => ({
        url: 'https://overpass-api.de/api/interpreter',
        method: 'POST',
        body: `
          [out:json];
          nw(around:${radius},${lat},${lon})["sport"="climbing"];
          (._;>;);
          out body;
        `,
      }),
      providesTags: (result, error, arg) => [{ type: 'Spots', id: `${arg.radius}-${arg.lat}-${arg.lon}` as const }],
      keepUnusedDataFor: 3600 * 24, // Cache duration set to 24 hours
      transformResponse: (response: any) => {
        const nodes = response.elements.filter((e: any) => e.type === "node");
        const unnamedNodes = nodes.filter((e: any) => !e.tags?.name);
        const namedNodes = nodes.filter((e: any) => !!e.tags?.name);
        let firstNode;
        const wayNodes = response.elements
          .filter((e: any) => e.type === "way")
          .map((e: any) => {
            firstNode = unnamedNodes.find((n: any) => n.id == e.nodes[0]);
            return {
              ...e,
              tags: {
                ...e.tags,
                name: e.tags.name || "unnamed",
              },
              lat: firstNode.lat,
              lon: firstNode.lon,
            };
        });
        const result = namedNodes.concat(wayNodes);
        return result;
      }
    }),
    getCurrentWeather: builder.query({
      query: ({ lat, lon }: { lat: number, lon: number }) => (`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${weatherAPIKey}`),
      providesTags: (result, error, arg) => [{ type: 'Weather', id: `${arg.lat}-${arg.lon}` as const }],
      keepUnusedDataFor: 3600, // Cache duration set to 1 hour
    }),

    getForecast: builder.query({
      query: ({ lat, lon }: { lat: number, lon: number }) => ({
        url: `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${weatherAPIKey}`,
        method: 'GET',
      }),
      providesTags: (result, error, arg) => [{ type: 'Forecast', id: `${arg.lat}-${arg.lon}` as const }],
      keepUnusedDataFor: 3600 * 6, // Cache duration set to 6 hours
    }),
  }),
});

export const {
  useGetClimbingSpotsQuery,
  useGetCurrentWeatherQuery,
  useGetForecastQuery,
} = api;
