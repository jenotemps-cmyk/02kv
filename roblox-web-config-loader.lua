print("Sacrifice loader started")

local SERVER_URL = "wss://getsacrifice.bonto.run?token=PASTE_YOUR_TOKEN_HERE"
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
    -- Parse the config text into a table
    local configFunc, compileErr = loadstring("return " .. configText)
    if not configFunc then
        warn("Failed to compile config:", compileErr)
        return false
    end

    local parseOk, cloudConfig = pcall(configFunc)
    if not parseOk then
        warn("Failed to parse config:", cloudConfig)
        return false
    end

    if type(cloudConfig) ~= "table" then
        warn("Config is not a table")
        return false
    end

    -- Merge cloud config into existing Sacrifice table
    if getgenv().Sacrifice then
        deepMerge(getgenv().Sacrifice, cloudConfig)
        getgenv().sacrifice = getgenv().Sacrifice
        getgenv().sacrifice.Triggerbot = getgenv().sacrifice['Trigger Bot']
        
        -- Trigger refresh if the source script has this function
        if getgenv().Sacrifice_RefreshLocals then
            getgenv().Sacrifice_RefreshLocals()
        end
        
        print("✓ Cloud config applied successfully")
        return true
    else
        warn("Sacrifice table not initialized yet")
        return false
    end
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
        applyConfig(data.config)
    end
end)

socket.OnClose:Connect(function()
    warn("⚠ Sacrifice WebSocket closed")
end)
