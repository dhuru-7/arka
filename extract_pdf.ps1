$bytes = [System.IO.File]::ReadAllBytes('d:\project_arka\gnatt chart arka generation.pdf')
$text = [System.Text.Encoding]::ASCII.GetString($bytes)
# Extract readable text between BT and ET markers (PDF text objects)
$pattern = 'BT[\s\S]*?ET'
$matches = [regex]::Matches($text, $pattern)
foreach ($m in $matches) {
    $content = $m.Value
    # Extract text within parentheses (PDF literal strings)
    $strings = [regex]::Matches($content, '\(([^)]+)\)')
    foreach ($s in $strings) {
        $val = $s.Groups[1].Value -replace '[^\x20-\x7E]', ''
        if ($val.Trim().Length -gt 0) {
            Write-Output $val
        }
    }
}
