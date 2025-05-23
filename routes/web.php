<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\StaffController;
use App\Http\Controllers\Admin\StaffGroupController;
use App\Http\Controllers\Admin\GateController;
use App\Http\Controllers\Admin\ShiftAssignmentController;
use App\Http\Controllers\Admin\SystemConfigController;
use App\Http\Controllers\Admin\ExtraShiftController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Middleware\VerifyAjaxRequest;
use App\Http\Controllers\Admin\ReviewController;
use App\Http\Controllers\Api\TicketController;

Route::prefix('admin')->group(function () {
    Route::get('/', function () {
        if (Auth::check()) {
            return redirect()->route('admin.dashboard');
        }
        return view('admin.login');
    })->name('admin.login');
    
    Route::post('/login', [AuthController::class, 'login'])->name('admin.login.post');
    Route::post('/logout', [AuthController::class, 'logout'])->name('admin.logout');
    
    Route::middleware(['auth'])->group(function () {
        Route::get('/dashboard', function () {
            return view('admin.dashboard');
        })->name('admin.dashboard');
        
        Route::get('/users', function () {
            return view('admin.user-manager');
        })->name('admin.user-manager');

        Route::get('/staff', function () {
            return view('admin.staff-manager');
        })->name('admin.staff-manager');

        Route::get('/gate', function () {
            return view('admin.gate');
        })->name('admin.gate');

        Route::get('/staff-group', function () {
            return view('admin.staff-group');
        })->name('admin.staff-group');

        Route::get('/shift-assignments', function () {
            return view('admin.shift-assignments');
        })->name('admin.shift-assignments');

        Route::get('/add-shift-gate', function () {
            return view('admin.add-shift-gate');
        })->name('admin.add-shift-gate');

        Route::get('/add-extra-shift', function () {
            return view('admin.add-extra-shift');
        })->name('admin.add-extra-shift');

        Route::get('/checkout-screen', function () {
            return view('admin.checkout-screen');
        })->name('admin.checkout-screen');

        Route::get('/settings', function () {
            return view('admin.settings');
        })->name('admin.settings');

        Route::get('/payment-report', function () {
            return view('admin.payment-report');
        })->name('admin.payment-report');

        Route::get('/payment-all', function () {
            return view('admin.payment-all');
        })->name('admin.payment-all');

        Route::get('/waiting-list-for-checkin-report', function () {
            return view('admin.waiting-list-for-checkin-report');
        })->name('admin.waiting-list-for-checkin-report');

        Route::get('/checkin-list-report', function () {
            return view('admin.checkin-list-report');
        })->name('admin.checkin-list-report');

        Route::get('/checkout-list-report', function () {
            return view('admin.checkout-list-report');
        })->name('admin.checkout-list-report');

        Route::get('/used-tickets-list-report', function () {
            return view('admin.used-tickets-list-report');
        })->name('admin.used-tickets-list-report');

        Route::get('/accounts-payable', function () {
            return view('admin.accounts-payable');
        })->name('admin.accounts-payable');

        Route::get('/reviews', function () {
            return view('admin.reviews');
        })->name('admin.reviews');

        Route::get('/revenue-detail-report', function () {
            return view('admin.revenue-detail-report');
        })->name('admin.revenue-detail-report');
        
        Route::get('/ticket-print-history-report', function () {
            return view('admin.ticket-print-history-report');
        })->name('admin.ticket-print-history-report');

        Route::get('/revenue-report', function () {
            return view('admin.revenue-report');
        })->name('admin.revenue-report');

        Route::get('/ticket-by-hours-report', function () {
            return view('admin.ticket-by-hours-report');
        })->name('admin.ticket-by-hours-report');

        Route::get('/ticket-by-name-report', function () {
            return view('admin.ticket-by-name-report');
        })->name('admin.ticket-by-name-report');

        // Thêm route toggle status cho staff
        Route::put('/staffs/{staff}/toggle-status', [StaffController::class, 'toggleStatus'])
            ->name('admin.staffs.toggle-status');

        // Thêm route cho staff
        Route::post('/staffs', [StaffController::class, 'store'])
            ->name('admin.staffs.store');
        Route::put('/staffs/{staff}', [StaffController::class, 'update'])
            ->name('admin.staffs.update');

        Route::get('/current-user', function () {
            $user = Auth::user();
            if ($user->permission != null) {
                $user->permission = json_decode($user->permission);
            }
            return response()->json($user);
        });

        Route::get('/license/status', [AuthController::class, 'checkLicenseStatus'])
            ->name('admin.license.status');
    });

    // Route login cho admin
    Route::get('/login', function () {
        return redirect('/admin');
    })->name('login');
});

Route::prefix('api/admin')->group(function () {
    Route::get('/check-license', [AuthController::class, 'checkLicenseStatus'])
            ->name('admin.check-license');
    Route::apiResource('users', UserController::class);
    Route::post('/users/{user}/permissions', [UserController::class, 'updatePermission']);
    Route::apiResource('staffs', StaffController::class);
    Route::apiResource('staff-groups', StaffGroupController::class);
    Route::get('/export-staffs', [StaffController::class, 'exportStaff']);
    Route::apiResource('gates', GateController::class);
    Route::get('/shift-assignments-data', [ShiftAssignmentController::class, 'getData']);
    Route::get('/staffs-by-group/{groupId}', [StaffController::class, 'getStaffsByGroup']);
    Route::get('/shift-assignments/get-staffs', [ShiftAssignmentController::class, 'getStaffsByGroup']);
    Route::post('/shift-assignments', [ShiftAssignmentController::class, 'createShiftAssignment'])
    ->name('admin.shift-assignments.store');
    Route::post('/get-assignments-dasboard', [ShiftAssignmentController::class, 'getAssignmentDashboard']);
    Route::get('/staff/search', [StaffController::class, 'search']);
    // Route::get('/get-assignments-by-gate', [ShiftAssignmentController::class, 'getAssignmentByGate']);
    // Route::post('/staff-checkin', [ShiftAssignmentController::class, 'staffCheckin']);
    Route::get('/dashboard-data', [DashboardController::class, 'index'])->name('admin.dashboard-data');
    Route::get('/system-configs', [SystemConfigController::class, 'index'])->name('admin.system-configs');
    Route::post('/system-configs', [SystemConfigController::class, 'store'])->name('admin.system-configs.store');
    Route::post('/staff-checkout', [ShiftAssignmentController::class, 'staffCheckout']);
    Route::get('/shift-staff-stats', [DashboardController::class, 'getShiftStaffStats']);
    Route::post('/create-extra-shift', [ExtraShiftController::class, 'createUpdateExtraShift']);
    Route::get('/get-extra-staffs-by-group', [ExtraShiftController::class, 'getExtraStaffsByGroup']);
    Route::post('/staff/change-gate', [StaffController::class, 'changeGate']);
    Route::post('/delete-gate-shift', [ShiftAssignmentController::class, 'deleteGateShift']);
    Route::get('/get-waiting-staffs', [ReportController::class, 'getWaitingList']);
    Route::get('/get-staff-report', [ReportController::class, 'getStaffReport']);
    Route::get('/get-ticket-report', [ReportController::class, 'getTicketReport']);
    Route::get('/get-staff-payments', [PaymentController::class, 'getStaffPayments']);
    Route::get('/get-payment-summary', [PaymentController::class, 'getPaymentSummary']);
    Route::post('/get-checked-tickets-by-staff', [PaymentController::class, 'getCheckedTicketsByStaff']);
    Route::post('/get-staff-payment', [PaymentController::class, 'getStaffPayment']);
    Route::post('/create-payment', [PaymentController::class, 'createPayment']);
    Route::post('/delete-payment', [PaymentController::class, 'deletePayment']);
    Route::get('/get-payment-report', [ReportController::class, 'getPaymentReport']);
    // Route::get('/get-checked-tickets-by-gate', [DashboardController::class, 'getCheckedTicketsByGate']);
    Route::post('/create-default-gate-assignment', [ShiftAssignmentController::class, 'createDefaultGateAssignment']);
    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::get('/reviews/export', [ReviewController::class, 'export']);
    Route::get('/get-ticket-by-name', [ReportController::class, 'getTicketByName']);
    Route::get('/get-payment-all-data', [PaymentController::class, 'getPaymentAllData']);
    Route::post('/create-payment-all', [PaymentController::class, 'createPaymentAll']);
});

// Route không cần xác thực
Route::get('/api/admin/get-assignments-by-gate', [ShiftAssignmentController::class, 'getAssignmentByGate']);
Route::post('api/admin/staff-checkin', [ShiftAssignmentController::class, 'staffCheckin']);
Route::get('api/admin/get-checked-tickets-by-gate', [DashboardController::class, 'getCheckedTicketsByGate']);
Route::post('api/admin/use-ticket', [TicketController::class, 'useTicketInGate']);
Route::get('api/admin/staff-checked-tickets', [TicketController::class, 'getCheckedTicketsByStaff']);
Route::get('api/admin/check-ticket', [TicketController::class, 'checkTicket']);
Route::get('api/admin/get-staff-report-by-code', [ReportController::class, 'getStaffReportByCode']);

Route::get('admin/queue-display', function () {
    return view('admin.queue-display');
})->name('admin.queue-display');

Route::get('admin/staff-checkin', function () {
    return view('admin.staff-checkin');
})->name('admin.staff-checkin');