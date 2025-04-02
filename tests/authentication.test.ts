import { describe, it, expect, beforeEach } from "vitest"

describe("Authentication Contract", () => {
  // Mock state
  let productAuthentications = new Map()
  let verificationAttempts = new Map()
  const contractOwner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  let currentSender = contractOwner
  let blockHeight = 100
  
  // Mock functions
  const registerProduct = (productId: string, batchId: string, manufacturerId: string, verificationCode: string) => {
    if (currentSender !== contractOwner) {
      return { error: "ERR-NOT-AUTHORIZED" }
    }
    
    if (productAuthentications.has(productId)) {
      return { error: "ERR-ALREADY-REGISTERED" }
    }
    
    productAuthentications.set(productId, {
      batchId,
      manufacturerId,
      isAuthentic: true,
      verificationCode,
    })
    
    return { success: true }
  }
  
  const verifyProduct = (productId: string, verificationCode: string) => {
    if (!productAuthentications.has(productId)) {
      return { error: "ERR-NOT-FOUND" }
    }
    
    const product = productAuthentications.get(productId)
    
    const attemptKey = `${productId}-${currentSender}`
    const attemptData = verificationAttempts.has(attemptKey)
        ? verificationAttempts.get(attemptKey)
        : { attempts: 0, lastAttempt: 0, verified: false }
    
    // Check verification code
    if (verificationCode === product.verificationCode) {
      verificationAttempts.set(attemptKey, {
        attempts: attemptData.attempts + 1,
        lastAttempt: blockHeight,
        verified: true,
      })
      return { success: true }
    } else {
      verificationAttempts.set(attemptKey, {
        attempts: attemptData.attempts + 1,
        lastAttempt: blockHeight,
        verified: false,
      })
      return { error: "ERR-INVALID-CODE" }
    }
  }
  
  const isProductAuthentic = (productId: string) => {
    if (!productAuthentications.has(productId)) {
      return false
    }
    return productAuthentications.get(productId).isAuthentic
  }
  
  // Reset state before each test
  beforeEach(() => {
    productAuthentications = new Map()
    verificationAttempts = new Map()
    currentSender = contractOwner
    blockHeight = 100
  })
  
  it("should register a product for authentication", () => {
    const result = registerProduct("PROD001", "BATCH001", "MAN001", "secret-code-123")
    expect(result).toHaveProperty("success", true)
    expect(productAuthentications.has("PROD001")).toBe(true)
    expect(productAuthentications.get("PROD001").batchId).toBe("BATCH001")
  })
  
  it("should not allow non-owner to register product", () => {
    currentSender = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = registerProduct("PROD001", "BATCH001", "MAN001", "secret-code-123")
    expect(result).toHaveProperty("error", "ERR-NOT-AUTHORIZED")
  })
  
  it("should verify product with correct code", () => {
    registerProduct("PROD001", "BATCH001", "MAN001", "secret-code-123")
    currentSender = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" // Consumer
    const result = verifyProduct("PROD001", "secret-code-123")
    
    expect(result).toHaveProperty("success", true)
    
    const attemptKey = "PROD001-ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    expect(verificationAttempts.has(attemptKey)).toBe(true)
    expect(verificationAttempts.get(attemptKey).verified).toBe(true)
  })
  
  it("should reject verification with incorrect code", () => {
    registerProduct("PROD001", "BATCH001", "MAN001", "secret-code-123")
    currentSender = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" // Consumer
    const result = verifyProduct("PROD001", "wrong-code")
    
    expect(result).toHaveProperty("error", "ERR-INVALID-CODE")
    
    const attemptKey = "PROD001-ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    expect(verificationAttempts.has(attemptKey)).toBe(true)
    expect(verificationAttempts.get(attemptKey).verified).toBe(false)
  })
  
  it("should check if product is authentic", () => {
    registerProduct("PROD001", "BATCH001", "MAN001", "secret-code-123")
    expect(isProductAuthentic("PROD001")).toBe(true)
    expect(isProductAuthentic("NONEXISTENT")).toBe(false)
  })
})

