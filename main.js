const log = console.log.bind(console)

class MyPromise {
    constructor(executor) {
        let status = 'pending'
        let result = null
        this._init()
        // closure
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
                setImmediate(hook, status, result)
            })
        }
        const resolve = pendingEnsure((value) => {
            transformStatus('fulfilled', value)
        })
        const reject = pendingEnsure((err) => {
            transformStatus('rejected', err)
            setImmediate(() => {
                if (!this._processed) {
                    console.warn('UnhandledPromiseRejectionWarning:', err)
                    console.warn('DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.')
                }
            })
        })
        try {
            executor(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }

    _init() {
        this._hooks = []
        this._processed = false
    }

    _addHook(hook) {
        this._hooks.push(hook)
    }

    _execOnTransform(onTransform, promise, resolve, reject) {
        const info = this._getInfo()
        const { status, result } = info
        if (typeof onTransform === 'function') {
            let r = onTransform(result)
            if (r === promise) {
                // cause forever pending
                throw new TypeError(`Chaining cycle detected for promise #<${this.constructor.name}>`)
            } else if (r instanceof this.constructor) {
                r.then((value) => {
                    resolve(value)
                }).catch((e) => {
                    reject(e)
                })
            } else {
                resolve(r)
            }
        } else {
            if (status === 'fulfilled') {
                resolve(result)
            } else {
                reject(result)
            }
        }
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

    then(onFulfilled, onRejected) {
        this._processed = true
        const info = this._getInfo()
        const { status, result } = info
        if (status === 'pending') {
            let resolve, reject
            const promise = new this.constructor((res, rej) => {
                [resolve, reject] = [res, rej]
            })
            this._addHook((status, result) => {
                if (status === 'fulfilled') {
                    this._execOnTransform(onFulfilled, promise, resolve, reject)
                } else {
                    this._execOnTransform(onRejected, promise, resolve, reject)
                }
            })
            return promise
        } else {
            let callback = status === 'fulfilled' ? onFulfilled : onRejected
            const promise = new this.constructor((resolve, reject) => {
                setImmediate(() => {
                    this._execOnTransform(callback, promise, resolve, reject)
                })
            })
            return promise
        }
    }

    catch (onRejected) {
        this._processed = true
        const info = this._getInfo()
        const { status, result } = info
        if (status === 'pending') {
            let resolve, reject
            const promise = new this.constructor((res, rej) => {
                [resolve, reject] = [res, rej]
            })
            this._addHook((status, result) => {
                if (status === 'fulfilled') {
                    resolve(result)
                } else {
                    this._execOnTransform(onRejected, promise, resolve, reject)
                }
            })
            return promise
        } else if (status === 'fulfilled') {
            return new this.constructor((resolve, reject) => {
                setImmediate(resolve, result)
            })
        } else {
            const promise = new this.constructor((resolve, reject) => {
                setImmediate(() => {
                    this._execOnTransform(onRejected, promise, resolve, reject)
                })
            })
            return promise
        }
    }

    finally(onFinally) {
        this._processed = true
        const info = this._getInfo()
        const { status, result } = info
        if (status === 'pending') {
            let resolve, reject
            const promise = new this.constructor((res, rej) => {
                [resolve, reject] = [res, rej]
            })
            this._addHook((status, result) => {
                onFinally()
                if (status === 'fulfilled') {
                    resolve(result)
                } else {
                    reject(result)
                }
            })
            return promise
        } else {
            return new this.constructor((resolve, reject) => {
                setImmediate(() => {
                    onFinally()
                    if (status === 'fulfilled') {
                        resolve(result)
                    } else {
                        reject(result)
                    }
                })
            })
        }
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
    
    setTimeout(ensure, 1000, arr, nArr(4), 'basic')
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

    setTimeout(ensure, 1000, arr, nArr(4), 'exec order')
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
    
    setTimeout(ensure, 1000, arr, nArr(1), 'resolve & reject')
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
    
    setTimeout(ensure, 1000, arr, nArr(3), 'repeated calls')
}

const test5 = () => {
    const arr = []
    MyPromise.resolve(1)
        .then(2)
        .then(MyPromise.resolve(3))
        .then((v) => {
            arr.push(v)
        })

    setTimeout(ensure, 1000, arr, nArr(1), 'illegal onFulfilled')
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
    
    setTimeout(ensure, 1000, arr, nArr(4), 'tick order')
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



