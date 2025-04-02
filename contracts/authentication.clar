;; Authentication Contract
;; This contract allows consumers to confirm medication authenticity

;; Define data maps
(define-map product-authentications
  { product-id: (string-ascii 20) }
  {
    batch-id: (string-ascii 20),
    manufacturer-id: (string-ascii 20),
    is-authentic: bool,
    verification-code: (buff 32)
  }
)

(define-map verification-attempts
  { product-id: (string-ascii 20), user: principal }
  {
    attempts: uint,
    last-attempt: uint,
    verified: bool
  }
)

;; Define error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-REGISTERED u101)
(define-constant ERR-NOT-FOUND u102)
(define-constant ERR-INVALID-CODE u105)

;; Define contract owner
(define-data-var contract-owner principal tx-sender)

;; Check if caller is contract owner
(define-private (is-contract-owner)
  (is-eq tx-sender (var-get contract-owner))
)

;; Register a product for authentication
(define-public (register-product
    (product-id (string-ascii 20))
    (batch-id (string-ascii 20))
    (manufacturer-id (string-ascii 20))
    (verification-code (buff 32))
  )
  (begin
    (asserts! (is-contract-owner) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (map-get? product-authentications { product-id: product-id })) (err ERR-ALREADY-REGISTERED))

    (ok (map-set product-authentications
      { product-id: product-id }
      {
        batch-id: batch-id,
        manufacturer-id: manufacturer-id,
        is-authentic: true,
        verification-code: verification-code
      }
    ))
  )
)

;; Verify product authenticity
(define-public (verify-product
    (product-id (string-ascii 20))
    (verification-code (buff 32))
  )
  (let (
    (product (unwrap! (map-get? product-authentications { product-id: product-id }) (err ERR-NOT-FOUND)))
    (attempts-data (default-to
                    { attempts: u0, last-attempt: u0, verified: false }
                    (map-get? verification-attempts { product-id: product-id, user: tx-sender })))
  )
    ;; Check verification code
    (if (is-eq verification-code (get verification-code product))
      (begin
        ;; Update verification attempts
        (map-set verification-attempts
          { product-id: product-id, user: tx-sender }
          {
            attempts: (+ (get attempts attempts-data) u1),
            last-attempt: block-height,
            verified: true
          }
        )
        (ok true)
      )
      (begin
        ;; Update failed verification attempts
        (map-set verification-attempts
          { product-id: product-id, user: tx-sender }
          {
            attempts: (+ (get attempts attempts-data) u1),
            last-attempt: block-height,
            verified: false
          }
        )
        (err ERR-INVALID-CODE)
      )
    )
  )
)

;; Check if a product is authentic
(define-read-only (is-product-authentic (product-id (string-ascii 20)))
  (match (map-get? product-authentications { product-id: product-id })
    product (get is-authentic product)
    false
  )
)

;; Get product details
(define-read-only (get-product-details (product-id (string-ascii 20)))
  (map-get? product-authentications { product-id: product-id })
)

;; Get verification attempts
(define-read-only (get-verification-attempts (product-id (string-ascii 20)) (user principal))
  (map-get? verification-attempts { product-id: product-id, user: user })
)

