const log = console.log.bind(console)

class MyPromise {
    constructor(executor) {
        this._hooks = []
        this._processed = false
        let status = 'pending'
        let result = null
        // 用闭包存储 promise 的状态，防止被手动篡改
        this._getInfo = () => ({
            status,
            result
        })

        const pendingEnsure = (callback) => {
            return (...args) => {
                if (status === 'pending') {
                    callback(...args)
                }
            }
        }
        
        const transformStatus = (s, r) => {
            status = s
            result = r
            this._hooks.forEach((hook) => {
                this._addMicrotask(() => hook(status, result))
            })
        }
        
        const resolve = pendingEnsure((value) => {
            transformStatus('fulfilled', value)
        })
        
        const reject = pendingEnsure((err) => {
            transformStatus('rejected', err)
            this._addMicrotask(() => {
                if (!this._processed) {
                    // 只要调用过 then / catch / finally 方法就说明 promise 的状态已经传递给下一个 pipe，就不会触发当前实例的未捕获异常
                    console.warn('UnhandledPromiseRejectionWarning:', err)
                }
            })
        })
        
        try {
            executor(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }

    _addMicrotask(callback) {
        process.nextTick(callback)
    }

    _addHook(hook) {
        this._hooks.push(hook)
    }

    _execOnTransform(onFulfilled, onRejected, resolve, reject, promise) {
        const { status, result } = this._getInfo()
        const callback = status === 'fulfilled' ? onFulfilled : onRejected
        if (typeof callback === 'function') {
            const r = callback(result)
            if (r === promise) {
                // 防止造成永久的 pending
                throw new TypeError(`Chaining cycle detected for promise #<${this.constructor.name}>`)
            } else if (r instanceof this.constructor) {
                r.then(resolve, reject)
            } else {
                resolve(r)
            }
        } else {
            // onFulfilled 或 onRejected 不是函数时会发生值穿透
            if (status === 'fulfilled') {
                resolve(result)
            } else {
                reject(result)
            }
        }
    }

    then(onFulfilled, onRejected) {
        this._processed = true
        const { status } = this._getInfo()
        const promise = new this.constructor((resolve, reject) => {
            if (status === 'pending') {
                this._addHook(() => this._execOnTransform(onFulfilled, onRejected, resolve, reject, promise))
            } else {
                this._addMicrotask(() => this._execOnTransform(onFulfilled, onRejected, resolve, reject, promise))
            }
        })
        return promise
    }

    catch(onRejected) {
        return this.then(null, onRejected)
    }
    
    _execOnFinally(onFinally, resolve, reject) {
      if (typeof onFinally === 'function') {
          onFinally()
      }
      const { status, result } = this._getInfo()
      if (status === 'fulfilled') {
          resolve(result)
      } else {
          reject(result)
      }
    }

    finally(onFinally) {
        this._processed = true
        const { status } = this._getInfo()
        const promise = new this.constructor((resolve, reject) => {
            if (status === 'pending') {
                this._addHook(() => this._execOnFinally(onFinally, resolve, reject))
            } else {
                this._addMicrotask(() => this._execOnFinally(onFinally, resolve, reject))
            }
        })
        return promise
    }
    
    toString() {
        return `[object ${this.constructor.name}]`
    }

    valueOf() {
        const info = this._getInfo()
        const { status, result } = info
        if (status === 'pending') {
            return `${this.constructor.name} { <pending> }`
        } else if (status === 'fulfilled') {
            return `${this.constructor.name} { ${result} }`
        } else {
            return `${this.constructor.name} { \n  <rejected> ${result} }`
        }
    }

    // Deprecated Method: to format output with console.log in Node.js 
    inspect() {
        return this.valueOf()
    }

    static resolve(value) {
        return new this((resolve, reject) => {
            resolve(value)
        })
    }

    static reject(reason) {
        return new this((resolve, reject) => {
            reject(reason)
        })
    }

    static all(...args) {
        // todo
        const promise = new this.constructor((resolve, reject) => {
            
        })
        return promise
    }

    static race(...args) {
        // todo
        const promise = new this.constructor((resolve, reject) => {
            
        })
        return promise
    }
}



////////////////////////////////////////////////////////////////////////////////

// test

const p = function(ms, v, success=true) {
    return new MyPromise((resolve, reject) => {
        setTimeout(function() {
            if (success) {
                resolve(v)
            } else {
                reject(v)
            }
        }, ms)
    })
}

const ensure = function(a, b, message) {
    const r1 = JSON.stringify(a)
    const r2 = JSON.stringify(b)
    if (r1 !== r2) {
        console.log(`test --> ${message} **** error ****\n  ${r1} != ${r2}`)
    } else {
        console.log(`test --> ${message} OK!`)
    }
}

const nArr = (n) => {
    const arr = []
    for (let i = 1; i <= n; i++) {
        arr.push(i)
    }
    return arr
}

const test1 = () => {
    const arr = []
    p(100, 'p1').then((v) => {
        arr.push(1)
        return p(100, 'p2', false)
    }).then((v) => {
        arr.push(null)
        return 100
    }).then((v) => {
        arr.push(null)
    }, (e) => {
        arr.push(2)
        return p(100, 'p3', false)
    }).catch((e) => {
        arr.push(3)
        return p(100, 'p4')
    }).finally(() => {
        arr.push(4)
    })
    
    setTimeout(() => {
        ensure(arr, nArr(4), 'basic')
    }, 1000)
}

const test2 = () => {
    const arr = []
    const promise = new MyPromise((resolve, reject) => {
        arr.push(1)
        resolve()
        arr.push(2)
    })
    promise.then(() => {
        arr.push(4)
    })
    arr.push(3)

    setTimeout(() => {
        ensure(arr, nArr(4), 'exec order')
    }, 1000)
}

const test3 = () => {
    const arr = []
    const promise = new MyPromise((resolve, reject) => {
        resolve(1)
        reject(2)
        resolve(3)
    })
    promise.then((res) => {
        arr.push(res)
    }).catch((err) => {
        arr.push(err)
    })
    
    setTimeout(() => {
        ensure(arr, nArr(1), 'resolve & reject')
    }, 1000)
}

const test4 = () => {
    const arr = []
    const promise = new MyPromise((resolve, reject) => {
        setTimeout(() => {
            resolve('success')
            arr.push(1)
        }, 100)
    })

    promise.then((res) => {
        res === 'success' && arr.push(2)
    })
    promise.then((res) => {
        res === 'success' && arr.push(3)
    })
    
    setTimeout(() => {
        ensure(arr, nArr(3), 'repeated calls')
    }, 1000)
}

const test5 = () => {
    const arr = []
    MyPromise.resolve(1)
        .then(2)
        .then(MyPromise.resolve(3))
        .then((v) => {
            arr.push(v)
        })

    setTimeout(() => {
        ensure(arr, nArr(1), 'illegal onFulfilled')
    }, 1000)
}

const test6 = () => {
    const arr = []
    process.nextTick(() => {
      arr.push(2)
    })
    MyPromise.resolve().then(() => {
        arr.push(3)
    })
    setImmediate(() => {
        arr.push(4)
    })
    arr.push(1)
    
    setTimeout(() => {
        ensure(arr, nArr(4), 'tick order')
    }, 1000)
}

const test = () => {
    log('testing ...')
    test1()
    test2()
    test3()
    test4()
    test5()
    test6()
}

test()
