print("Sacrifice loader started")

local SERVER_URL = "wss://getsacrifice.up.railway.app?token=PASTE_YOUR_TOKEN_HERE"
local SOURCE_URL = "https://vss.pandauth.com/virtual/file/68d8a1b8a2a7448c"
local HttpService = game:GetService("HttpService")

-- Deep merge utility to merge cloud config into existing config
local function deepMerge(dst, src)
    for k, v in pairs(src) do
        if type(v) == "table" and type(dst[k]) == "table" then
            deepMerge(dst[k], v)
        else
            dst[k] = v
        end
    end
end

-- Apply cloud config by merging it into the existing Sacrifice table
local function applyConfig(configText)
    print("[DEBUG] Applying config, type:", type(configText))

    if not configText or type(configText) ~= "string" then
        warn("Config text invalid")
        return false
    end

    local configFunc, compileErr = loadstring(configText)

    if not configFunc then
        warn("Failed to compile config:", compileErr)
        print("[DEBUG] Failed config text:", configText:sub(1, 500))
        return false
    end

    local execOk, execErr = pcall(configFunc)

    if not execOk then
        warn("Failed to execute config:", execErr)
        return false
    end

    local cloudConfig = getgenv().Sacrifice or getgenv().sacrifice

    if type(cloudConfig) ~= "table" then
        warn("Cloud config did not create Sacrifice table")
        return false
    end

    print("[DEBUG] Config executed successfully")

    getgenv().sacrifice = getgenv().Sacrifice
    getgenv().sacrifice.Triggerbot = getgenv().sacrifice['Trigger Bot']

    if getgenv().Sacrifice_RefreshLocals then
        pcall(getgenv().Sacrifice_RefreshLocals)
    end

    print("✓ Cloud config applied successfully")
    return true
end

-- Load the source script immediately
print("⏳ Loading source script...")
local sourceOk, sourceErr = pcall(function()
    local source = game:HttpGet(SOURCE_URL)
    print("✓ Source downloaded (" .. #source .. " bytes)")
    
    -- Execute the source script
    loadstring(source)()
end)

if not sourceOk then
    warn("❌ Source script error:", sourceErr)
    return
end

print("✓ Source script loaded with defaults")

-- Connect to WebSocket for config updates
local socket
local ok, err = pcall(function()
    socket = WebSocket.connect(SERVER_URL)
end)

if not ok or not socket then
    warn("WebSocket failed:", err)
    return
end

print("✓ Connected to Sacrifice WebSocket")
print("💡 Click 'Activate Config' on the website to apply your settings")

socket.OnMessage:Connect(function(msg)
    local decodedOk, data = pcall(function()
        return HttpService:JSONDecode(msg)
    end)

    if not decodedOk then
        warn("Could not decode packet")
        return
    end

    if data.type == "update" then
        print("✓ Received config update from website")
        print("[DEBUG] Config length:", data.config and #data.config or "nil")
        print("[DEBUG] Config preview:", data.config and data.config:sub(1, 200) or "nil")
        applyConfig(data.config)
    end
end)

socket.OnClose:Connect(function()
    warn("⚠ Sacrifice WebSocket closed")
end)
