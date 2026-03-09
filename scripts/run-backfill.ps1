$token = "e6db6251ca6f40f78814df00f8c28a7d"
$uri = "https://forgestudyai.vercel.app/api/internal/lms/backfill-topics"

Write-Host "Calling backfill API..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "`nSuccess!" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "`nError:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
}
