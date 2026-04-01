try {
    $r = Invoke-WebRequest http://localhost:3000 -ErrorAction SilentlyContinue
    if($r.StatusCode -eq 200) {
        Write-Host "✅ Server is running - Status 200"
    }
} catch {
    Write-Host "⚠️  Server connection error. Make sure npm start is running"
}
