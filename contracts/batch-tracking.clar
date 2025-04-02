;; Batch Tracking Contract
;; This contract monitors medications from production to pharmacy

;; Define data maps
(define-map batches
  { batch-id: (string-ascii 20) }
  {
    manufacturer-id: (string-ascii 20),
    product-name: (string-ascii 50),
    production-date: uint,
    expiry-date: uint,
    current-custodian: principal,
    status: (string-ascii 10)
  }
)

(define-map batch-history
  { batch-id: (string-ascii 20), timestamp: uint }
  {
    custodian: principal,
    location: (string-ascii 50),
    status: (string-ascii 10)
  }
)

;; Define error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-REGISTERED u101)
(define-constant ERR-NOT-FOUND u102)
(define-constant ERR-NOT-CURRENT-CUSTODIAN u103)

;; Define contract owner
(define-data-var contract-owner principal tx-sender)

;; Check if caller is contract owner
(define-private (is-contract-owner)
  (is-eq tx-sender (var-get contract-owner))
)

;; Register a new batch
(define-public (register-batch
    (batch-id (string-ascii 20))
    (manufacturer-id (string-ascii 20))
    (product-name (string-ascii 50))
    (production-date uint)
    (expiry-date uint)
  )
  (begin
    (asserts! (is-contract-owner) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (map-get? batches { batch-id: batch-id })) (err ERR-ALREADY-REGISTERED))

    ;; Set initial batch data
    (map-set batches
      { batch-id: batch-id }
      {
        manufacturer-id: manufacturer-id,
        product-name: product-name,
        production-date: production-date,
        expiry-date: expiry-date,
        current-custodian: tx-sender,
        status: "produced"
      }
    )

    ;; Record initial history entry
    (map-set batch-history
      { batch-id: batch-id, timestamp: block-height }
      {
        custodian: tx-sender,
        location: "manufacturer",
        status: "produced"
      }
    )

    (ok true)
  )
)

;; Transfer batch custody
(define-public (transfer-batch
    (batch-id (string-ascii 20))
    (new-custodian principal)
    (location (string-ascii 50))
    (new-status (string-ascii 10))
  )
  (let (
    (batch (unwrap! (map-get? batches { batch-id: batch-id }) (err ERR-NOT-FOUND)))
  )
    (asserts! (is-eq (get current-custodian batch) tx-sender) (err ERR-NOT-CURRENT-CUSTODIAN))

    ;; Update batch current status
    (map-set batches
      { batch-id: batch-id }
      (merge batch {
        current-custodian: new-custodian,
        status: new-status
      })
    )

    ;; Record history entry
    (map-set batch-history
      { batch-id: batch-id, timestamp: block-height }
      {
        custodian: new-custodian,
        location: location,
        status: new-status
      }
    )

    (ok true)
  )
)

;; Get batch details
(define-read-only (get-batch-details (batch-id (string-ascii 20)))
  (map-get? batches { batch-id: batch-id })
)

;; Get batch history entry
(define-read-only (get-batch-history-entry (batch-id (string-ascii 20)) (timestamp uint))
  (map-get? batch-history { batch-id: batch-id, timestamp: timestamp })
)

