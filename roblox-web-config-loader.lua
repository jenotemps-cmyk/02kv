print("Sacrifice loader started")

local SERVER_URL = "wss://getsacrifice.bonto.run?token=PASTE_YOUR_TOKEN_HERE"
local SOURCE_URL = "https://vss.pandauth.com/virtual/file/68d8a1b8a2a7448c"
local HttpService = game:GetService("HttpService")

local function applyConfig(configText)
    local configFunc, compileErr = loadstring(configText)
    if not configFunc then
        return false, "Failed to compile config: " .. tostring(compileErr)
    end

    local runOk, runErr = pcall(configFunc)
    if not runOk then
        return false, "Failed to execute config: " .. tostring(runErr)
    end

    local newConfig = getgenv().sacrifice or getgenv().Sacrifice
    if typeof(newConfig) ~= "table" then
        return false, "Website config did not create getgenv().sacrifice or getgenv().Sacrifice"
    end

    -- Cloud config fully replaces script defaults (no merge)
    getgenv().sacrifice = newConfig
    getgenv().Sacrifice = newConfig
    return true
end

local socket
local ok, err = pcall(function()
    socket = WebSocket.connect(SERVER_URL)
end)

if not ok or not socket then
    warn("WebSocket failed:", err)
    return
end

print("Connected to Sacrifice WebSocket")

local hasLoadedSource = false

socket.OnMessage:Connect(function(msg)
    print("Received packet")

    local decodedOk, data = pcall(function()
        return HttpService:JSONDecode(msg)
    end)

    if not decodedOk then
        warn("Could not decode packet")
        return
    end

    if data.type ~= "init" and data.type ~= "update" then
        return
    end

    print("Lua configuration text received")

    if not hasLoadedSource then
        hasLoadedSource = true
        print("Initializing main source script...")

        local sourceOk, sourceErr = pcall(function()
            local source = game:HttpGet(SOURCE_URL)
            print("Source downloaded, length:", #source)
            loadstring(source)()
        end)

        if not sourceOk then
            warn("Source script error: " .. tostring(sourceErr))
            hasLoadedSource = false
            return
        end

        print("Source script executed successfully")
    end

    local configOk, configErr = applyConfig(data.config)
    if not configOk then
        warn(configErr)
        return
    end

    print("Website config applied (cloud overrides script defaults)")
end)

socket.OnClose:Connect(function()
    warn("Sacrifice WebSocket closed")
end)
