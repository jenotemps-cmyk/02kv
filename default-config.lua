getgenv().Sacrifice = {

    ["Global WallCheck"] = true,
    ["Knock Check"] = true,

    Watermark = {
        Enabled = false,
        Username = "Sacrifice.cc",
        Color = Color3.fromRGB(12, 12, 255),
    },

    ['Silent Aim'] = {
        ['Enabled'] = true,
        ['Ignore Fov'] = false,

        ['One Tap'] = {
            ['Enabled'] = false,
        },

        Tracer = {
            Enabled = false,
            Color = Color3.fromRGB(255, 0, 0),
            Thickness = 1.5,
            Transparency = 1.0,
        },

        ['Legit'] = {
            ['Enabled'] = false,
            ['Hit Chance'] = 100,
            ['FovScalingHitChance'] = true,
            ['DistanceScalingHitChance'] = false,
            ['Max Distance'] = 800,
            ['Prefer Visible'] = true,

            ['Smoothing'] = {
                ['Enabled'] = false,
                ['Factor'] = 0.35,
            },

            ['Reaction Delay'] = {
                ['Enabled'] = false,
                ['Min'] = 0.05,
                ['Max'] = 0.15,
            },

            ['Wall Check'] = {
                ['Enabled'] = false,
            },

            ['Anti Curve'] = {
                ['Enabled'] = false,
                ['Max Angle'] = 15,
            },

            ['Scaling'] = {
                ['Enabled'] = true,
                ['Factor'] = 1,
            },

            ['Anti Aimview'] = {
                ['Enabled'] = true,
                ['Max Angle'] = 15,
            },

            ['Checks'] = {
                ['Max Distance'] = 1222,
                ['Auto Distance'] = false,
            },
        },

        ['Settings'] = {
            ['Hit Part'] = 'Closest Point',

            ['Closest Point'] = {
                ['Samples'] = 3,
                ['Diagonal'] = false,
                ['ShowPoints'] = false,
                ['PointColor'] = Color3.fromRGB(255, 0, 0),
            },

            ['Auto Predictions'] = {
                ['Enabled'] = false,
                ['Intensity'] = 1,
                ['Max Offset'] = 15,
            },

            ['Predictions'] = {
                ['Enabled'] = false,
                ['Values'] = { ['x'] = 0, ['y'] = 0, ['z'] = 0 },
            },

            ['Fov'] = {
                ['Enabled'] = true,
                ['Visible'] = false,
                ['Radius'] = 350,
                ['Thickness'] = 1.5,
                ['Transparency'] = 1,
                ['Filled'] = false,
                ['Color'] = Color3.fromRGB(0, 17, 255),
                ['Override'] = { ['Enabled'] = false, ['GetExternalRadius'] = nil },
            },
        },

        TargetPriority = "Fov",
        Mode = "Target",
        TargetKeybind = "C",
        LockedTarget = nil,
        TargetModeForceHit = true,
        Smoothing = 0.1,
        HitChance = 100,
        AntiCurve = true,
        HitPart = "Closest",
        HorizontalPrediction = 0,
        VerticalPrediction = 0,
        FOV = {
            Visible = false,
            Radius = 350,
            Color = Color3.fromRGB(0, 17, 255),
            Mode = "Circle",
        },
    },

    ['Trigger Bot'] = {
        ['Enabled'] = true,
        ['Keybind'] = "T",
        ['TargetKeybind'] = "H",
        ['LockedTarget'] = nil,
        ['Interval'] = 0.01,
        ['Activation'] = 'Toggle',
        ['Mode'] = 'Fov',
        ['Knock Check'] = true,

        ['Checks'] = {
            ['Max Distance'] = 3411,
            ['Auto Distance'] = false,
        },

        ['Input'] = {
            ['Enabled'] = true,
            ['Start'] = 0,
            ['End'] = 0,
        },

        ['Settings'] = {
            ['Hits'] = 'Everything',
            ['HumanizedReaction'] = true,

            ['Auto Predictions'] = {
                ['Enabled'] = false,
                ['Intensity'] = 1,
                ['Max Offset'] = 15,
            },

            ['Predictions'] = {
                ['Enabled'] = false,
                ['Values'] = { ['x'] = 0, ['y'] = 0, ['z'] = 0 },
            },

            ['Fov'] = {
                ['Visible'] = false,
                ['X'] = 534423,
                ['Y'] = 6234234,
                ['Z'] = 23432432235,
            },
        },

        Weapons = {
            '[Double-Barrel SG]',
            '[Revolver]',
            '[TacticalShotgun]',
            '[Tactical Shot shotgun]',
            '[Glock]',
        },

        HitParts = {
            Type = false,
            Parts = {
                'Head', 'UpperTorso', 'HumanoidRootPart', 'LowerTorso',
                'LeftHand', 'RightHand', 'LeftLowerArm', 'RightLowerArm',
                'LeftUpperArm', 'RightUpperArm', 'LeftFoot', 'LeftLowerLeg',
                'LeftUpperLeg', 'RightLowerLeg', 'RightFoot', 'RightUpperLeg',
            },
        },

        CustomSize = {
            Enabled = true,
            Value = 40,
        },

        Active = false,
        Prediction = 0,
        Mode = "Toggle",
        Delay = 0.01,
    },

    ['Camlock'] = {
        ['Enabled'] = true,
        ['Keybind'] = "Q",
        ['UnlockOnDeath'] = true,
        ['WallCheck'] = true,
        ['Snappiness'] = 0.045,
        ['Ignore Fov'] = true,
        ['Activation'] = 'Toggle',
        ['Mode'] = 'Fov',
        ['Smooth Mode'] = 'Legit',
        ['Method'] = 'Camera',

        ['Checks'] = {
            ['Max Distance'] = 1000,
            ['First Person'] = true,
            ['Third Person'] = true,
        },

        ['Settings'] = {
            ['Part'] = 'UpperTorso',
            ['Blend'] = 0.17,
            ['DynamicHeightCompensation'] = true,
            ['VerticalAdjustmentOffset'] = 0,

            ['HumanShake'] = {
                ['Enabled'] = true,
                ['Amount'] = 0.55,
            },

            ['Fov'] = {
                ['Visible'] = false,
                ['X'] = 432423418,
                ['Y'] = 12342342348,
                ['Z'] = 12342343248,
            },

            ['Auto Predictions'] = {
                ['Enabled'] = false,
                ['Intensity'] = 1,
                ['Max Offset'] = 15,
            },

            ['Predictions'] = {
                ['Enabled'] = true,
                ['Values'] = { ['x'] = 0.125, ['y'] = 0.225, ['z'] = 0.125 },
            },
        },

        Shake = {
            Enabled = true,
            ShakeMode = "WholeBody",
            X = 0.5,
            Y = 0.5,
        },

        Robotic = {
            Enabled = false,
            ModeSwitchKeybind = "G",
            FlickKeybind = "F",

            Overshoot = {
                Enabled = true,
                Multiplier = 1.35,
                DecaySpeed = 12,
            },

            Jitter = {
                Enabled = true,
                Frequency = 45,
                AmplitudeX = 2.2,
                AmplitudeY = 2.2,
            },

            Spasm = {
                Enabled = true,
                Chance = 0.08,
                MaxSpikeDistance = 5.5,
            },
        },

        HitPart = "UpperTorso",
        TargetMode = "Toggle",
        HorizontalPrediction = 0,
        VerticalPrediction = 0,
        Fov = 20,

        Tracer = {
            Enabled = false,
            Color = Color3.fromRGB(255, 0, 0),
            Thickness = 1.5,
            Opacity = 0.7,
        },
    },

    Orbit = {
        Enabled = false,
        Keybind = "Z",
        TargetPlayer = nil,
        Distance = 10,
        Height = 0,
        Speed = 6150,
        AutoKill = true,
        AutoReload = true,
        ReloadAmmoCount = 0,
    },

    SpreadMod = {
        Enabled = false,
        Amount = 70,
    },

    ["Hitbox Expander"] = {
        Enabled = false,
        Size = 110,
        Visualize = false,
        ["Ignore Dead"] = false,
    },

    ["Weapon Mods"] = {
        Traced = {
            RapidFire = false,
            RapidFireDelay = 0.01,
        },

        ["Delay Changer"] = {
            Enabled = true,
            GlobalDelay = 0.08,
            Weapons = {
                ["[Revolver]"] = { Enabled = false, Delay = 0.05 },
                ["[Glock]"] = { Enabled = false, Delay = 0.05 },
                ["[Double-Barrel SG]"] = { Enabled = false, Delay = 0.05 },
                ["[Tactical Shotgun]"] = { Enabled = false, Delay = 0.05 },
            },
        },

        RageMode = {
            Enabled = false,
            FireInterval = 0.00001,
        },
    },

    Visuals = {
        ["Color Modifications"] = {
            Enabled = false,
            Vibrancy = 0.45,
            Contrast = 0,
            Brightness = 0,
        },

        Sky = {
            Enabled = true,
            Color = "Black",
        },

        ESP = {
            Enabled = true,
            Keybind = "B",
            Size = 11,
            DefaultColor = Color3.fromRGB(255, 255, 255),
            TargetColor = Color3.fromRGB(255, 0, 0),
            SilentAimTargetColor = Color3.fromRGB(255, 0, 255),
        },
    },

    ["Speed Modifications"] = {
        Options = {
            Enabled = true,
            DefaultSpeed = 35,
            Method = "WalkSpeed",
            Keybind = "V",
        },
    },

    ["Jump Modifications"] = {
        Enabled = false,
        JumpPower = 60,
        Keybind = "H",
    },

    ["Damage Modifications"] = {
        Overrider = { Enabled = false, Damage = 200 },
        Amplifier = { Enabled = false, Multiplier = 35 },
    },

    Spiderman = {
        Enabled = true,
        ["Jump Boost"] = 80,
        ["Jump Height"] = 80,
        ["Jump Delay"] = 0,
        Keybind = "J",
    },

    ["Wallbang"] = {
        Enabled = true,
    },

    AntiStomp = {
        Enabled = false,
    },

    ["Panic Ground"] = {
        Enabled = true,
        Keybind = "P",
    },

    Noclip = {
        Enabled = false,
        Keybind = "N",
        Active = false,
    },

    ["Skin Changer"] = {
        Enabled = false,
        Skins = {
            ["[Revolver]"] = "Inferno",
            ["[Glock]"] = "Blue Dagger",
            ["[Knife]"] = "Golden Age Tanto",
            ["[Double Barrel SG]"] = "Galaxy",
        },
    },

    ["Avatar Modifications"] = {
        Enabled = false,
        Headless = false,
        Korblox = false,
        Morph = {
            Enabled = true,
            TargetId = 3577180836,
        },
    },

    Hitsounds = {
        Enabled = false,
        Sound = "",
        Volume = 3,
    },

    ["Infinite Range"] = {
        Enabled = true,
        Range = 10000,
        BypassPos = 1,
    },

}
