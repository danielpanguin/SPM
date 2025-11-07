declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'

  interface UserOptions {
    head?: any[][]
    body?: any[][]
    foot?: any[][]
    startY?: number
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number }
    pageBreak?: 'auto' | 'avoid' | 'always'
    tableWidth?: 'auto' | 'wrap' | number
    showHead?: 'everyPage' | 'firstPage' | 'never'
    showFoot?: 'everyPage' | 'lastPage' | 'never'
    tableLineColor?: number | number[]
    tableLineWidth?: number
    styles?: any
    headStyles?: any
    bodyStyles?: any
    footStyles?: any
    alternateRowStyles?: any
    columnStyles?: { [key: string]: any }
    theme?: 'striped' | 'grid' | 'plain'
  }

  function autoTable(doc: jsPDF, options: UserOptions): void

  export default autoTable
}
