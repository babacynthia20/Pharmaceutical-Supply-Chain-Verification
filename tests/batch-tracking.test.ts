import { describe, it, expect, beforeEach } from "vitest"

describe("Batch Tracking Contract", () => {
  // Mock state
  let batches = new Map()
  let batchHistory = new Map()
  const contractOwner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  let currentSender = contractOwner
  let blockHeight = 100
  
  // Mock functions
  const registerBatch = (
      batchId: string,
      manufacturerId: string,
      productName: string,
      productionDate: number,
      expiryDate: number,
  ) => {
    if (currentSender !== contractOwner) {
      return { error: "ERR-NOT-AUTHORIZED" }
    }
    
    if (batches.has(batchId)) {
      return { error: "ERR-ALREADY-REGISTERED" }
    }
    
    batches.set(batchId, {
      manufacturerId,
      productName,
      productionDate,
      expiryDate,
      currentCustodian: currentSender,
      status: "produced",
    })
    
    const historyKey = `${batchId}-${blockHeight}`
    batchHistory.set(historyKey, {
      custodian: currentSender,
      location: "manufacturer",
      status: "produced",
    })
    
    return { success: true }
  }
  
  const transferBatch = (batchId: string, newCustodian: string, location: string, newStatus: string) => {
    if (!batches.has(batchId)) {
      return { error: "ERR-NOT-FOUND" }
    }
    
    const batch = batches.get(batchId)
    if (batch.currentCustodian !== currentSender) {
      return { error: "ERR-NOT-CURRENT-CUSTODIAN" }
    }
    
    batch.currentCustodian = newCustodian
    batch.status = newStatus
    batches.set(batchId, batch)
    
    blockHeight += 1
    const historyKey = `${batchId}-${blockHeight}`
    batchHistory.set(historyKey, {
      custodian: newCustodian,
      location,
      status: newStatus,
    })
    
    return { success: true }
  }
  
  const getBatchDetails = (batchId: string) => {
    if (!batches.has(batchId)) {
      return null
    }
    return batches.get(batchId)
  }
  
  // Reset state before each test
  beforeEach(() => {
    batches = new Map()
    batchHistory = new Map()
    currentSender = contractOwner
    blockHeight = 100
  })
  
  it("should register a new batch", () => {
    const result = registerBatch("BATCH001", "MAN001", "Aspirin 100mg", 1620000000, 1720000000)
    expect(result).toHaveProperty("success", true)
    expect(batches.has("BATCH001")).toBe(true)
    expect(batches.get("BATCH001").productName).toBe("Aspirin 100mg")
  })
  
  it("should not allow non-owner to register batch", () => {
    currentSender = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = registerBatch("BATCH001", "MAN001", "Aspirin 100mg", 1620000000, 1720000000)
    expect(result).toHaveProperty("error", "ERR-NOT-AUTHORIZED")
  })
  
  it("should transfer batch custody", () => {
    registerBatch("BATCH001", "MAN001", "Aspirin 100mg", 1620000000, 1720000000)
    const distributor = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = transferBatch("BATCH001", distributor, "distribution center", "in-transit")
    
    expect(result).toHaveProperty("success", true)
    expect(batches.get("BATCH001").currentCustodian).toBe(distributor)
    expect(batches.get("BATCH001").status).toBe("in-transit")
    
    // Check history was recorded
    const historyKey = `BATCH001-101`
    expect(batchHistory.has(historyKey)).toBe(true)
    expect(batchHistory.get(historyKey).location).toBe("distribution center")
  })
  
  it("should not allow unauthorized transfer", () => {
    registerBatch("BATCH001", "MAN001", "Aspirin 100mg", 1620000000, 1720000000)
    currentSender = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" // Not the current custodian
    const distributor = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = transferBatch("BATCH001", distributor, "distribution center", "in-transit")
    
    expect(result).toHaveProperty("error", "ERR-NOT-CURRENT-CUSTODIAN")
  })
  
  it("should get batch details", () => {
    registerBatch("BATCH001", "MAN001", "Aspirin 100mg", 1620000000, 1720000000)
    const details = getBatchDetails("BATCH001")
    
    expect(details).not.toBeNull()
    expect(details.manufacturerId).toBe("MAN001")
    expect(details.status).toBe("produced")
  })
})

