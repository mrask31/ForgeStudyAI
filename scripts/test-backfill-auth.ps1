$token = "e6db6251ca6f40f78814df00f8c28a7d"
$uri = "https://forgestudyai.vercel.app/api/internal/lms/backfill-topics"

Write-Host "Testing backfill endpoint authentication..." -ForegroundColor Cyan
Write-Host ""

# Test 1: No auth (should get 401)
Write-Host "Test 1: No authentication header" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $uri -Method POST
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 401) { "Green" } else { "Red" })
    if ($statusCode -eq 401) {
        Write-Host "  ✓ Auth is working (rejected unauthorized request)" -ForegroundColor Green
    }
}

Write-Host ""

# Test 2: Wrong token (should get 401)
Write-Host "Test 2: Wrong token" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers @{
        "Authorization" = "Bearer wrong-token-12345"
    }
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 401) { "Green" } else { "Red" })
    if ($statusCode -eq 401) {
        Write-Host "  ✓ Auth is working (rejected wrong token)" -ForegroundColor Green
    }
}

Write-Host ""

# Test 3: Correct token (should get 200 or 500 with details)
Write-Host "Test 3: Correct token" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers @{
        "Authorization" = "Bearer $token"
    }
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Response:" -ForegroundColor Cyan
    Write-Host $response.Content
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "  Error details:" -ForegroundColor Red
        Write-Host $errorBody
    }
}
