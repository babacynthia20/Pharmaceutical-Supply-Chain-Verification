;; Manufacturer Verification Contract
;; This contract validates legitimate drug producers

;; Define data maps
(define-map manufacturers
  { manufacturer-id: (string-ascii 20) }
  {
    name: (string-ascii 50),
    license-number: (string-ascii 20),
    is-verified: bool,
    verification-date: uint
  }
)

;; Define error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-REGISTERED u101)
(define-constant ERR-NOT-FOUND u102)

;; Define contract owner
(define-data-var contract-owner principal tx-sender)

;; Check if caller is contract owner
(define-private (is-contract-owner)
  (is-eq tx-sender (var-get contract-owner))
)

;; Register a new manufacturer
(define-public (register-manufacturer
    (manufacturer-id (string-ascii 20))
    (name (string-ascii 50))
    (license-number (string-ascii 20))
  )
  (begin
    (asserts! (is-contract-owner) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (map-get? manufacturers { manufacturer-id: manufacturer-id })) (err ERR-ALREADY-REGISTERED))

    (ok (map-set manufacturers
      { manufacturer-id: manufacturer-id }
      {
        name: name,
        license-number: license-number,
        is-verified: false,
        verification-date: u0
      }
    ))
  )
)

;; Verify a manufacturer
(define-public (verify-manufacturer (manufacturer-id (string-ascii 20)))
  (begin
    (asserts! (is-contract-owner) (err ERR-NOT-AUTHORIZED))
    (match (map-get? manufacturers { manufacturer-id: manufacturer-id })
      manufacturer (ok (map-set manufacturers
                        { manufacturer-id: manufacturer-id }
                        (merge manufacturer {
                          is-verified: true,
                          verification-date: block-height
                        })
                      ))
      (err ERR-NOT-FOUND)
    )
  )
)

;; Check if a manufacturer is verified
(define-read-only (is-manufacturer-verified (manufacturer-id (string-ascii 20)))
  (match (map-get? manufacturers { manufacturer-id: manufacturer-id })
    manufacturer (ok (get is-verified manufacturer))
    (err ERR-NOT-FOUND)
  )
)

;; Get manufacturer details
(define-read-only (get-manufacturer-details (manufacturer-id (string-ascii 20)))
  (map-get? manufacturers { manufacturer-id: manufacturer-id })
)

