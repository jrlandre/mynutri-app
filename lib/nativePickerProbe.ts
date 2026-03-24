export function probeNativePicker(input: HTMLInputElement, timeoutMs = 800): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const settle = (result: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      window.removeEventListener('blur', onBlur)
      resolve(result)
    }
    const onBlur = () => settle(true)
    const timer = setTimeout(() => settle(false), timeoutMs)
    window.addEventListener('blur', onBlur)
    input.click()
  })
}
