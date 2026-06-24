<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WeatherService
{
    private string $baseUrl = 'https://api.openweathermap.org/data/2.5/weather';

    /** Seconds to cache a successful weather response. */
    private int $cacheTtl = 1800; // 30 minutes

    public function current(string $city = 'Accra'): array
    {
        $apiKey = config('services.openweather.key', '');

        if (empty($apiKey)) {
            return ['available' => false, 'message' => 'Weather service not configured'];
        }

        $city = $this->sanitizeCity($city);
        $cacheKey = 'weather:current:'.strtolower($city);

        return Cache::remember($cacheKey, $this->cacheTtl, fn () => $this->fetch($city, $apiKey));
    }

    private function fetch(string $city, string $apiKey): array
    {
        try {
            $response = Http::timeout(5)->get($this->baseUrl, [
                'q' => $city.',GH',
                'appid' => $apiKey,
                'units' => 'metric',
            ]);

            if (! $response->successful()) {
                Log::warning('Weather API returned non-2xx', [
                    'city' => $city,
                    'status' => $response->status(),
                ]);

                return ['available' => false, 'message' => 'Weather unavailable'];
            }

            $data = $response->json();

            return [
                'available' => true,
                'location' => $data['name'] ?? $city,
                'country' => $data['sys']['country'] ?? 'GH',
                'temperature' => (int) round($data['main']['temp'] ?? 0),
                'feels_like' => (int) round($data['main']['feels_like'] ?? 0),
                'unit' => 'C',
                'condition' => ucfirst($data['weather'][0]['description'] ?? 'Unknown'),
                'humidity' => $data['main']['humidity'] ?? null,
                'updated_at' => now()->toISOString(),
            ];
        } catch (\Exception $e) {
            Log::error('WeatherService exception', ['city' => $city, 'error' => $e->getMessage()]);

            return ['available' => false, 'message' => 'Weather unavailable'];
        }
    }

    /** Strip characters that are not part of a city name to prevent injection. */
    private function sanitizeCity(string $city): string
    {
        $clean = preg_replace('/[^a-zA-Z\s\-,]/', '', $city);

        return trim($clean) ?: 'Accra';
    }
}
