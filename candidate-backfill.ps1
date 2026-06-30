$secret = $env:ADMIN_BACKFILL_SECRET  # Set via: $env:ADMIN_BACKFILL_SECRET = "your-secret-here"

for ($i = 1; $i -le 160; $i++) {
  Write-Host "Candidate Batch $i"

  $body = @{
    action = "backfill_candidate_embeddings"
    limit = 10
    admin_secret = $secret
  } | ConvertTo-Json -Depth 5

  try {
    $res = Invoke-RestMethod -Uri "https://perkesoprax-ai.<YOUR_CF_ACCOUNT>.workers.dev/api/interview" `
      -Method POST `
      -Headers @{
        "Content-Type" = "application/json"
      } `
      -Body $body

    $res | ConvertTo-Json -Depth 5

    if ($res.updated -eq 0) {
      Write-Host "Stopped: no more candidate updates."
      break
    }
  } catch {
    Write-Host "Request failed:"
    Write-Host $_.Exception.Message
    break
  }

  Start-Sleep -Seconds 1
}