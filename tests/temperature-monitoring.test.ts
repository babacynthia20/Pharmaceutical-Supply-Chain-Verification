import { describe, it, expect, beforeEach } from "vitest"

describe("Temperature Monitoring Contract", () => {
  // Mock state
  let temperatureLogs = new Map()
  let temperatureThresholds = new Map()
  const contractOwner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  let currentSender = contractOwner
  let blockHeight = 100
  
  // Mock functions
  const setTemperatureThresholds = (
      productType: string,
      minTemp: number,
      maxTemp: number,
      minHumidity: number,
      maxHumidity: number,
  ) => {
    if (currentSender !== contractOwner) {
      return { error: "ERR-NOT-AUTHORIZED" }
    }
    
    if (minTemp >= maxTemp || minHumidity >= maxHumidity) {
      return { error: "ERR-INVALID-THRESHOLD" }
    }
    
    temperatureThresholds.set(productType, {
      minTemp,
      maxTemp,
      minHumidity,
      maxHumidity,
    })
    
    return { success: true }
  }
  
  const recordTemperature = (batchId: string, temperature: number, humidity: number, location: string) => {
    const logKey = `${batchId}-${blockHeight}`
    temperatureLogs.set(logKey, {
      temperature,
      humidity,
      recorder: currentSender,
      location,
    })
    
    return { success: true }
  }
  
  const isTemperatureValid = (productType: string, temperature: number, humidity: number) => {
    if (!temperatureThresholds.has(productType)) {
      return false
    }
    
    const threshold = temperatureThresholds.get(productType)
    return (
        temperature >= threshold.minTemp &&
        temperature <= threshold.maxTemp &&
        humidity >= threshold.minHumidity &&
        humidity <= threshold.maxHumidity
    )
  }
  
  // Reset state before each test
  beforeEach(() => {
    temperatureLogs = new Map()
    temperatureThresholds = new Map()
    currentSender = contractOwner
    blockHeight = 100
  })
  
  it("should set temperature thresholds", () => {
    const result = setTemperatureThresholds("vaccine", 2, 8, 30, 60)
    expect(result).toHaveProperty("success", true)
    expect(temperatureThresholds.has("vaccine")).toBe(true)
    expect(temperatureThresholds.get("vaccine").minTemp).toBe(2)
    expect(temperatureThresholds.get("vaccine").maxTemp).toBe(8)
  })
  
  it("should not allow invalid thresholds", () => {
    const result = setTemperatureThresholds("vaccine", 8, 2, 30, 60)
    expect(result).toHaveProperty("error", "ERR-INVALID-THRESHOLD")
  })
  
  it("should record temperature readings", () => {
    const result = recordTemperature("BATCH001", 5, 45, "warehouse")
    expect(result).toHaveProperty("success", true)
    
    const logKey = "BATCH001-100"
    expect(temperatureLogs.has(logKey)).toBe(true)
    expect(temperatureLogs.get(logKey).temperature).toBe(5)
    expect(temperatureLogs.get(logKey).humidity).toBe(45)
  })
  
  it("should validate temperature within thresholds", () => {
    setTemperatureThresholds("vaccine", 2, 8, 30, 60)
    
    // Valid temperature and humidity
    expect(isTemperatureValid("vaccine", 5, 45)).toBe(true)
    
    // Invalid temperature
    expect(isTemperatureValid("vaccine", 10, 45)).toBe(false)
    
    // Invalid humidity
    expect(isTemperatureValid("vaccine", 5, 70)).toBe(false)
    
    // Non-existent product type
    expect(isTemperatureValid("unknown", 5, 45)).toBe(false)
  })
})

