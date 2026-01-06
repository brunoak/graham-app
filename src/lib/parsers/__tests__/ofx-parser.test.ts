/**
 * @fileoverview Unit tests for OFX Parser
 * 
 * Tests bank code detection for all 10 supported banks:
 * - Traditional: Itaú (341), BB (001), Bradesco (237), Santander (033), Caixa (104)
 * - Fintechs: Nubank (260), Inter (077), C6 (336), BTG (208), PicPay (N/A - no OFX)
 */

import { describe, it, expect } from 'vitest'
import { parseOFX, isValidOFX, detectBankFromOFX } from '../ofx-parser'

describe('OFX Parser', () => {
    describe('isValidOFX', () => {
        it('should return true for valid OFX content', () => {
            const ofxContent = `
                OFXHEADER:100
                DATA:OFXSGML
                <OFX>
                    <STMTTRN>
                        <TRNTYPE>DEBIT</TRNTYPE>
                        <DTPOSTED>20241210</DTPOSTED>
                        <TRNAMT>-50.00</TRNAMT>
                        <MEMO>IFOOD *RESTAURANTE</MEMO>
                    </STMTTRN>
                </OFX>
            `
            expect(isValidOFX(ofxContent)).toBe(true)
        })

        it('should return false for non-OFX content', () => {
            expect(isValidOFX('just some random text')).toBe(false)
            expect(isValidOFX('')).toBe(false)
        })
    })

    describe('detectBankFromOFX - Bank Codes', () => {
        // Traditional Banks
        it('should detect Itaú by code 0341', () => {
            expect(detectBankFromOFX('<BANKID>0341</BANKID>')).toBe('itau')
            expect(detectBankFromOFX('<FID>341</FID>')).toBe('itau')
        })

        it('should detect Banco do Brasil by code 001', () => {
            expect(detectBankFromOFX('<BANKID>001</BANKID>')).toBe('bb')
            expect(detectBankFromOFX('<BANKID>0001</BANKID>')).toBe('bb')
        })

        it('should detect Bradesco by code 237', () => {
            expect(detectBankFromOFX('<BANKID>0237</BANKID>')).toBe('bradesco')
            expect(detectBankFromOFX('<BANKID>237</BANKID>')).toBe('bradesco')
        })

        it('should detect Santander by code 033', () => {
            expect(detectBankFromOFX('<BANKID>0033</BANKID>')).toBe('santander')
            expect(detectBankFromOFX('<BANKID>033</BANKID>')).toBe('santander')
            expect(detectBankFromOFX('<BANKID>33</BANKID>')).toBe('santander')
        })

        it('should detect Caixa by code 104', () => {
            expect(detectBankFromOFX('<BANKID>0104</BANKID>')).toBe('caixa')
            expect(detectBankFromOFX('<BANKID>104</BANKID>')).toBe('caixa')
        })

        // Fintechs
        it('should detect Nubank by code 260', () => {
            expect(detectBankFromOFX('<BANKID>0260</BANKID>')).toBe('nubank')
            expect(detectBankFromOFX('<BANKID>260</BANKID>')).toBe('nubank')
        })

        it('should detect Inter by code 077', () => {
            expect(detectBankFromOFX('<BANKID>0077</BANKID>')).toBe('inter')
            expect(detectBankFromOFX('<BANKID>077</BANKID>')).toBe('inter')
            expect(detectBankFromOFX('<BANKID>77</BANKID>')).toBe('inter')
        })

        it('should detect C6 by code 336', () => {
            expect(detectBankFromOFX('<BANKID>0336</BANKID>')).toBe('c6')
            expect(detectBankFromOFX('<BANKID>336</BANKID>')).toBe('c6')
        })

        it('should detect BTG by code 208', () => {
            expect(detectBankFromOFX('<BANKID>0208</BANKID>')).toBe('btg')
            expect(detectBankFromOFX('<BANKID>208</BANKID>')).toBe('btg')
        })
    })

    describe('detectBankFromOFX - Bank Names', () => {
        it('should detect Itaú by name', () => {
            expect(detectBankFromOFX('<ORG>ITAU UNIBANCO</ORG>')).toBe('itau')
            expect(detectBankFromOFX('<ORG>ITAÚ</ORG>')).toBe('itau')
        })

        it('should detect Banco do Brasil by name', () => {
            expect(detectBankFromOFX('<ORG>BANCO DO BRASIL</ORG>')).toBe('bb')
        })

        it('should detect Bradesco by name', () => {
            expect(detectBankFromOFX('<ORG>BRADESCO</ORG>')).toBe('bradesco')
        })

        it('should detect Santander by name', () => {
            expect(detectBankFromOFX('<ORG>SANTANDER</ORG>')).toBe('santander')
        })

        it('should detect Caixa by name', () => {
            expect(detectBankFromOFX('<ORG>CAIXA ECONOMICA FEDERAL</ORG>')).toBe('caixa')
            expect(detectBankFromOFX('<ORG>CEF</ORG>')).toBe('caixa')
        })

        it('should detect Nubank by name', () => {
            expect(detectBankFromOFX('<ORG>NUBANK</ORG>')).toBe('nubank')
            expect(detectBankFromOFX('<ORG>NU PAGAMENTOS</ORG>')).toBe('nubank')
        })

        it('should detect Inter by name', () => {
            expect(detectBankFromOFX('<ORG>BANCO INTER</ORG>')).toBe('inter')
            expect(detectBankFromOFX('<ORG>INTER</ORG>')).toBe('inter')
        })

        it('should detect C6 by name', () => {
            expect(detectBankFromOFX('<ORG>C6 BANK</ORG>')).toBe('c6')
            expect(detectBankFromOFX('<ORG>C6BANK</ORG>')).toBe('c6')
        })

        it('should detect BTG by name', () => {
            expect(detectBankFromOFX('<ORG>BTG PACTUAL</ORG>')).toBe('btg')
            expect(detectBankFromOFX('<ORG>BTG</ORG>')).toBe('btg')
        })

        it('should return unknown for unrecognized banks', () => {
            expect(detectBankFromOFX('<FID>9999</FID>')).toBe('unknown')
            expect(detectBankFromOFX('<ORG>RANDOM BANK</ORG>')).toBe('unknown')
        })
    })

    describe('parseOFX - Transaction Parsing', () => {
        it('should parse a simple OFX file with one transaction', async () => {
            const ofxContent = `
                <OFX>
                    <BANKMSGSRSV1>
                        <STMTTRNRS>
                            <STMTRS>
                                <BANKTRANLIST>
                                    <STMTTRN>
                                        <TRNTYPE>DEBIT</TRNTYPE>
                                        <DTPOSTED>20241210</DTPOSTED>
                                        <TRNAMT>-150.50</TRNAMT>
                                        <MEMO>SUPERMERCADO EXTRA</MEMO>
                                    </STMTTRN>
                                </BANKTRANLIST>
                            </STMTRS>
                        </STMTTRNRS>
                    </BANKMSGSRSV1>
                </OFX>
            `

            const result = await parseOFX(ofxContent)

            expect(result.successCount).toBe(1)
            expect(result.errorCount).toBe(0)
            expect(result.transactions).toHaveLength(1)

            const tx = result.transactions[0]
            expect(tx.amount).toBe(150.50)
            expect(tx.type).toBe('expense')
            expect(tx.description).toBe('SUPERMERCADO EXTRA')
            expect(tx.date.getFullYear()).toBe(2024)
            expect(tx.date.getMonth()).toBe(11) // December (0-indexed)
            expect(tx.date.getDate()).toBe(10)
        })

        it('should parse multiple transactions', async () => {
            const ofxContent = `
                <OFX>
                    <STMTTRN>
                        <TRNTYPE>DEBIT</TRNTYPE>
                        <DTPOSTED>20241210</DTPOSTED>
                        <TRNAMT>-50.00</TRNAMT>
                        <MEMO>IFOOD</MEMO>
                    </STMTTRN>
                    <STMTTRN>
                        <TRNTYPE>CREDIT</TRNTYPE>
                        <DTPOSTED>20241209</DTPOSTED>
                        <TRNAMT>3000.00</TRNAMT>
                        <MEMO>SALARIO</MEMO>
                    </STMTTRN>
                    <STMTTRN>
                        <TRNTYPE>DEBIT</TRNTYPE>
                        <DTPOSTED>20241208</DTPOSTED>
                        <TRNAMT>-200.00</TRNAMT>
                        <MEMO>PIX ENVIADO</MEMO>
                    </STMTTRN>
                </OFX>
            `

            const result = await parseOFX(ofxContent)

            expect(result.successCount).toBe(3)
            expect(result.transactions).toHaveLength(3)

            // Check expense
            expect(result.transactions[0].type).toBe('expense')
            expect(result.transactions[0].amount).toBe(50.00)

            // Check income
            expect(result.transactions[1].type).toBe('income')
            expect(result.transactions[1].amount).toBe(3000.00)

            // Check another expense
            expect(result.transactions[2].type).toBe('expense')
            expect(result.transactions[2].amount).toBe(200.00)
        })

        it('should handle OFX date with timezone', async () => {
            const ofxContent = `
                <OFX>
                    <STMTTRN>
                        <TRNTYPE>DEBIT</TRNTYPE>
                        <DTPOSTED>20241015120000[-3:BRT]</DTPOSTED>
                        <TRNAMT>-99.99</TRNAMT>
                        <MEMO>TEST</MEMO>
                    </STMTTRN>
                </OFX>
            `

            const result = await parseOFX(ofxContent)

            expect(result.successCount).toBe(1)
            expect(result.transactions[0].date.getFullYear()).toBe(2024)
            expect(result.transactions[0].date.getMonth()).toBe(9) // October
            expect(result.transactions[0].date.getDate()).toBe(15)
        })

        it('should report errors for invalid transactions', async () => {
            const ofxContent = `
                <OFX>
                    <STMTTRN>
                        <TRNTYPE>DEBIT</TRNTYPE>
                        <DTPOSTED>invalid</DTPOSTED>
                        <TRNAMT>-50.00</TRNAMT>
                        <MEMO>INVALID DATE</MEMO>
                    </STMTTRN>
                    <STMTTRN>
                        <TRNTYPE>DEBIT</TRNTYPE>
                        <DTPOSTED>20241210</DTPOSTED>
                        <TRNAMT>notanumber</TRNAMT>
                        <MEMO>INVALID AMOUNT</MEMO>
                    </STMTTRN>
                </OFX>
            `

            const result = await parseOFX(ofxContent)

            expect(result.successCount).toBe(0)
            expect(result.errorCount).toBe(2)
            expect(result.errors.length).toBe(2)
        })

        it('should use NAME tag if MEMO is missing', async () => {
            const ofxContent = `
                <OFX>
                    <STMTTRN>
                        <TRNTYPE>DEBIT</TRNTYPE>
                        <DTPOSTED>20241210</DTPOSTED>
                        <TRNAMT>-75.00</TRNAMT>
                        <NAME>UBER TRIP</NAME>
                    </STMTTRN>
                </OFX>
            `

            const result = await parseOFX(ofxContent)

            expect(result.successCount).toBe(1)
            expect(result.transactions[0].description).toBe('UBER TRIP')
        })

        it('should detect bank from real OFX with BANKID', async () => {
            const ofxContent = `
                OFXHEADER:100
                <OFX>
                    <SIGNONMSGSRSV1>
                        <FI>
                            <ORG>Itau</ORG>
                            <FID>0341</FID>
                        </FI>
                    </SIGNONMSGSRSV1>
                    <BANKMSGSRSV1>
                        <STMTTRNRS>
                            <STMTRS>
                                <BANKACCTFROM>
                                    <BANKID>0341</BANKID>
                                </BANKACCTFROM>
                                <BANKTRANLIST>
                                    <STMTTRN>
                                        <TRNTYPE>DEBIT</TRNTYPE>
                                        <DTPOSTED>20241210</DTPOSTED>
                                        <TRNAMT>-100.00</TRNAMT>
                                        <MEMO>TESTE ITAU</MEMO>
                                    </STMTTRN>
                                </BANKTRANLIST>
                            </STMTRS>
                        </STMTTRNRS>
                    </BANKMSGSRSV1>
                </OFX>
            `

            const result = await parseOFX(ofxContent)

            expect(result.detectedBank).toBe('itau')
            expect(result.successCount).toBe(1)
        })
    })
})
