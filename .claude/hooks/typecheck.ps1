$stdin = [Console]::In.ReadToEnd()
$data  = $stdin | ConvertFrom-Json
$f     = $data.tool_input.file_path

if ($f -notmatch '\.ts$') { exit 0 }

Push-Location 'c:\Users\VM-Dev\Desktop\Space-counter'
$output = & npm run typecheck 2>&1 | Out-String
$rc     = $LASTEXITCODE
Pop-Location

if ($rc -ne 0) {
    @{
        hookSpecificOutput = @{
            hookEventName     = 'PostToolUse'
            additionalContext = "TypeScript errors after edit:`n$output"
        }
    } | ConvertTo-Json -Compress
}
