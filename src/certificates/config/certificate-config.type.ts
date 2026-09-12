export type CertificateConfig = {
  /** Issuer label printed on the card and shown on the verification page. */
  issuerName: string;
  /** Signature image; null means the card draws a placeholder stroke. */
  signatureUrl: string | null;
};
