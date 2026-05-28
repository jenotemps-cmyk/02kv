print("[Sacrifice] Loader started")

local SERVER_URL = "wss://getsacrifice.bonto.run?token=PASTE_YOUR_TOKEN_HERE"
local SOURCE_URL = "https://vss.pandauth.com/virtual/file/68d8a1b8a2a7448c"
local HttpService = game:GetService("HttpService")

local function cloneTable(src)
    local out = {}
    for k, v in pairs(src) do
        if type(v) == "table" then
            out[k] = cloneTable(v)
        else
            out[k] = v
        end
    end
    return out
end

local function syncIntoLiveTable(liveTable, newTable)
    table.clear(liveTable)
    for k, v in pairs(newTable) do
        if type(v) == "table" then
            liveTable[k] = cloneTable(v)
        else
            liveTable[k] = v
        end
    end
end

local function applyConfig(configText)
    if type(configText) ~= "string" or #configText == 0 then
        return false, "Config text is empty or invalid"
    end

    local liveConfig = getgenv().sacrifice or getgenv().Sacrifice
    
    local configFunc, compileErr = loadstring(configText)
    if not configFunc then
        return false, "Failed to compile config: " .. tostring(compileErr)
    end

    local runOk, runErr = pcall(configFunc)
    if not runOk then
        return false, "Failed to execute config: " .. tostring(runErr)
    end

    local newConfig = getgenv().sacrifice or getgenv().Sacrifice
    if type(newConfig) ~= "table" then
        return false, "Config did not create getgenv().sacrifice or getgenv().Sacrifice table"
    end

    if type(liveConfig) == "table" and liveConfig ~= newConfig then
        syncIntoLiveTable(liveConfig, newConfig)
        getgenv().sacrifice = liveConfig
        getgenv().Sacrifice = liveConfig
    else
        getgenv().sacrifice = newConfig
        getgenv().Sacrifice = newConfig
    end

    return true
end

local socket
local connectOk, connectErr = pcall(function()
    socket = WebSocket.connect(SERVER_URL)
end)

if not connectOk or not socket then
    warn("[Sacrifice] WebSocket connection failed: " .. tostring(connectErr))
    return
end

print("[Sacrifice] Connected to WebSocket")

local hasLoadedSource = false

socket.OnMessage:Connect(function(msg)
    print("[Sacrifice] Received message")

    if not msg or #msg == 0 then
        return
    end

    local decodedOk, data = pcall(function()
        return HttpService:JSONDecode(msg)
    end)

    if not decodedOk then
        warn("[Sacrifice] Failed to decode message")
        return
    end

    if not data or (data.type ~= "init" and data.type ~= "update") then
        return
    end

    print("[Sacrifice] Received config message, type: " .. tostring(data.type))

    if not hasLoadedSource then
        hasLoadedSource = true
        print("[Sacrifice] Loading main source script...")

        local sourceOk, sourceErr = pcall(function()
            local source = game:HttpGet(SOURCE_URL)
            if not source or #source == 0 then
                error("Source is empty")
            end
            print("[Sacrifice] Source downloaded, size: " .. #source .. " bytes")
            loadstring(source)()
        end)

        if not sourceOk then
            warn("[Sacrifice] Source script error: " .. tostring(sourceErr))
            hasLoadedSource = false
            return
        end

        print("[Sacrifice] Source script loaded successfully")
    end

    local configOk, configErr = applyConfig(data.config)
    if not configOk then
        warn("[Sacrifice] Config apply failed: " .. tostring(configErr))
        return
    end

    print("[Sacrifice] Config applied successfully")

    task.delay(0.35, function()
        local reapplyOk, reapplyErr = pcall(function()
            return applyConfig(data.config)
        end)
        if not reapplyOk then
            warn("[Sacrifice] Reapply failed: " .. tostring(reapplyErr))
            return
        end
        print("[Sacrifice] Config reapplied")
    end)
end)

socket.OnClose:Connect(function()
    warn("[Sacrifice] WebSocket connection closed")
end)

print("[Sacrifice] Loader ready, waiting for config messages...")
