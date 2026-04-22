$file = 'D:\Softphone-react\src\Softphone.jsx'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

$insert = @(
'                <p className="sp-settings-label" style={{ marginTop: 10 }}>Audio Codecs</p>',
'                {AUDIO_CODECS.map((c) => (',
'                  <label key={c} className="sp-codec-item">',
'                    <input type="checkbox" checked={form.audioCodecs.includes(c)} onChange={() => toggleCodec("audio", c)}/>',
'                    {c}',
'                  </label>',
'                ))}',
'                <p className="sp-settings-label" style={{ marginTop: 10 }}>Video Codecs</p>',
'                {VIDEO_CODECS.map((c) => (',
'                  <label key={c} className="sp-codec-item">',
'                    <input type="checkbox" checked={form.videoCodecs.includes(c)} onChange={() => toggleCodec("video", c)}/>',
'                    {c}',
'                  </label>',
'                ))}'
)

# Insert before line 423 (index 422)
$idx = 422
$newlines = $lines[0..($idx-1)] + $insert + $lines[$idx..($lines.Length-1)]

[System.IO.File]::WriteAllLines($file, $newlines, [System.Text.Encoding]::UTF8)
Write-Host "Done. Total lines: $($newlines.Count)"
