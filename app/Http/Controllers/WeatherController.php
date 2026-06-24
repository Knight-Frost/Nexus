<?php

namespace App\Http\Controllers;

use App\Services\WeatherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WeatherController extends Controller
{
    public function current(Request $request, WeatherService $weather): JsonResponse
    {
        $city = (string) $request->query('city', 'Accra');

        return response()->json($weather->current($city));
    }
}
