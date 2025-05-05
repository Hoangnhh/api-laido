<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemConfig;
use App\Enums\SystemConfigKey;
use Illuminate\Http\Request;

class SystemConfigController extends Controller
{
    private $show_config_keys = [
        SystemConfigKey::ENABLE_CHECKIN_BY_INDEX->value,
        SystemConfigKey::ENABLE_LIMIT_BY_VEHICAL_SIZE->value,
        SystemConfigKey::CHECKOUT_DELAY_MINUTE->value,
        SystemConfigKey::ENABLE_CHECKIN_ALL_GATE->value,
        SystemConfigKey::CHECKIN_TICKET_RANGE_MINUTE->value,
        SystemConfigKey::ENABLE_CHECKOUT_WITH_OTHER->value,
        SystemConfigKey::ENABLE_LOCK_STAFF_CHECKIN->value,

    ];
    public function index()
    {
        $configs = [];
        foreach (SystemConfigKey::cases() as $configKey) {
            if (in_array($configKey->value, $this->show_config_keys)) {
                $configs[$configKey->value] = [
                    'value' => SystemConfig::getConfig($configKey->value),
                    'description' => $configKey->getDescription()
                ];
            }
        }
            
        return response()->json($configs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'key' => 'required|string',
            'value' => 'required'
        ]);

        if (!SystemConfigKey::isValidKey($validated['key'])) {
            return response()->json(['message' => 'Key không hợp lệ'], 422);
        }

        SystemConfig::setConfig($validated['key'], $validated['value']);
        return response()->json(['message' => 'Cập nhật thành công']);
    }
} 