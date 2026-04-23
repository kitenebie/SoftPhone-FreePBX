# Laravel Backend Example for Recording Uploads

This guide shows how to create a Laravel API endpoint to receive and store call recordings from the softphone.

## 1. Create Migration

```bash
php artisan make:migration create_call_recordings_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_recordings', function (Blueprint $table) {
            $table->id();
            $table->string('extension')->nullable();
            $table->string('filename');
            $table->string('file_path');
            $table->date('recording_date');
            $table->string('timestamp');
            $table->bigInteger('file_size')->nullable();
            $table->string('mime_type')->nullable();
            $table->boolean('uploaded_successfully')->default(true);
            $table->timestamps();
            
            $table->index('recording_date');
            $table->index('extension');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_recordings');
    }
};
```

```bash
php artisan migrate
```

## 2. Create Model

```bash
php artisan make:model CallRecording
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CallRecording extends Model
{
    protected $fillable = [
        'extension',
        'filename',
        'file_path',
        'recording_date',
        'timestamp',
        'file_size',
        'mime_type',
        'uploaded_successfully',
    ];

    protected $casts = [
        'recording_date' => 'date',
        'uploaded_successfully' => 'boolean',
    ];
}
```

## 3. Create Controller

```bash
php artisan make:controller Api/CallRecordingController
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CallRecording;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class CallRecordingController extends Controller
{
    public function upload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'recording' => 'required|file|mimes:webm,mp4,avi|max:102400', // 100MB max
            'date' => 'required|date',
            'timestamp' => 'required|string',
            'extension' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('recording');
            $date = $request->input('date');
            $timestamp = $request->input('timestamp');
            $extension = $request->input('extension', 'unknown');

            // Check if recording for this date already exists
            $existingRecording = CallRecording::where('recording_date', $date)
                ->where('extension', $extension)
                ->first();

            if ($existingRecording) {
                return response()->json([
                    'success' => true,
                    'message' => 'Recording already exists for this date',
                    'data' => $existingRecording
                ], 200);
            }

            // Create directory structure: recordings/{year}/{month}/{extension}/
            $year = date('Y', strtotime($date));
            $month = date('m', strtotime($date));
            $directory = "recordings/{$year}/{$month}/{$extension}";

            // Store file in public storage
            $filename = $timestamp . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs($directory, $filename, 'public');

            // Save to database
            $recording = CallRecording::create([
                'extension' => $extension,
                'filename' => $filename,
                'file_path' => $filePath,
                'recording_date' => $date,
                'timestamp' => $timestamp,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'uploaded_successfully' => true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Recording uploaded successfully',
                'data' => $recording
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        $query = CallRecording::query();

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('recording_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('recording_date', '<=', $request->end_date);
        }

        // Filter by extension
        if ($request->has('extension')) {
            $query->where('extension', $request->extension);
        }

        $recordings = $query->orderBy('recording_date', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $recordings
        ]);
    }

    public function show($id)
    {
        $recording = CallRecording::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $recording
        ]);
    }

    public function download($id)
    {
        $recording = CallRecording::findOrFail($id);

        if (!Storage::disk('public')->exists($recording->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found'
            ], 404);
        }

        return Storage::disk('public')->download($recording->file_path, $recording->filename);
    }

    public function delete($id)
    {
        $recording = CallRecording::findOrFail($id);

        // Delete file from storage
        if (Storage::disk('public')->exists($recording->file_path)) {
            Storage::disk('public')->delete($recording->file_path);
        }

        // Delete database record
        $recording->delete();

        return response()->json([
            'success' => true,
            'message' => 'Recording deleted successfully'
        ]);
    }
}
```

## 4. Add Routes

In `routes/api.php`:

```php
<?php

use App\Http\Controllers\Api\CallRecordingController;
use Illuminate\Support\Facades\Route;

Route::prefix('recordings')->group(function () {
    Route::post('/upload', [CallRecordingController::class, 'upload']);
    Route::get('/', [CallRecordingController::class, 'index']);
    Route::get('/{id}', [CallRecordingController::class, 'show']);
    Route::get('/{id}/download', [CallRecordingController::class, 'download']);
    Route::delete('/{id}', [CallRecordingController::class, 'delete']);
});
```

## 5. Configure CORS (if needed)

In `config/cors.php`:

```php
<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'], // Change to your frontend URL in production
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
```

## 6. Create Storage Link

```bash
php artisan storage:link
```

This creates a symbolic link from `public/storage` to `storage/app/public`.

## 7. Usage in Softphone

Configure the softphone with your API URL:

```jsx
<Softphone
  autoRecord={true}
  recordingDir="video/recordings/Ksip"
  uploadApiUrl="https://your-domain.com/api/recordings/upload"
/>
```

Or set it in the settings panel:
- Upload API URL: `https://your-domain.com/api/recordings/upload`

## 8. API Endpoints

### Upload Recording
```
POST /api/recordings/upload
Content-Type: multipart/form-data

Body:
- recording: File (webm)
- date: String (YYYY-MM-DD)
- timestamp: String (ISO timestamp)
- extension: String (SIP extension number)
```

### List Recordings
```
GET /api/recordings?start_date=2024-01-01&end_date=2024-12-31&extension=1001
```

### Get Single Recording
```
GET /api/recordings/{id}
```

### Download Recording
```
GET /api/recordings/{id}/download
```

### Delete Recording
```
DELETE /api/recordings/{id}
```

## 9. File Storage Structure

Files are stored in:
```
storage/app/public/recordings/{year}/{month}/{extension}/{timestamp}.webm
```

Example:
```
storage/app/public/recordings/2024/04/1001/2024-04-21T14-30-45-123Z.webm
```

Accessible via:
```
https://your-domain.com/storage/recordings/2024/04/1001/2024-04-21T14-30-45-123Z.webm
```

## 10. Security Considerations

### Add Authentication (Optional)

```php
// In routes/api.php
Route::middleware('auth:sanctum')->prefix('recordings')->group(function () {
    Route::post('/upload', [CallRecordingController::class, 'upload']);
    // ... other routes
});
```

### Validate File Size in .env

```env
UPLOAD_MAX_FILESIZE=100M
POST_MAX_SIZE=100M
```

### Add Rate Limiting

```php
// In app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        'throttle:60,1', // 60 requests per minute
        // ...
    ],
];
```

## 11. Testing

```bash
# Test upload
curl -X POST https://your-domain.com/api/recordings/upload \
  -F "recording=@test.webm" \
  -F "date=2024-04-21" \
  -F "timestamp=2024-04-21T14-30-45-123Z" \
  -F "extension=1001"

# List recordings
curl https://your-domain.com/api/recordings

# Download recording
curl https://your-domain.com/api/recordings/1/download -o recording.webm
```

## 12. Database Queries

```php
// Get today's recordings
$today = CallRecording::whereDate('recording_date', today())->get();

// Get recordings by extension
$recordings = CallRecording::where('extension', '1001')->get();

// Get recordings for date range
$recordings = CallRecording::whereBetween('recording_date', ['2024-01-01', '2024-12-31'])->get();

// Get total storage used
$totalSize = CallRecording::sum('file_size');
```

## Notes

- Files are automatically organized by year/month/extension
- Duplicate uploads for the same date are prevented
- All files are stored in `storage/app/public/recordings/`
- Database tracks all metadata for easy querying
- Files can be accessed via public URL after `storage:link`
