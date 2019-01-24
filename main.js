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
        let next
        if (typeof onTransform === 'function') {
            try {
                next = onTransform(result)
            } catch (e) {
                reject(e)
                return
            }
        } else {
            if (status === 'fulfilled') {
                resolve(result)
            } else {
                reject(result)
            }
        }
        if (next === promise) {
            // cause forever pending
            throw new TypeError(`Chaining cycle detected for promise #<${this.constructor.name}>`)
        } else if (next instanceof this.constructor) {
            next.then((value) => {
                resolve(value)
            }).catch((e) => {
                reject(e)
            })
        } else {
            resolve(next)
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

const test1 = () => {
    const result = []
    p(100, 'p1').then((v) => {
        result.push(v)
        return p(100, 'p2', false)
    }).then(() => {
        result.push(null)
        return 100
    }).then(() => {
        result.push(null)
    }, (v) => {
        result.push(v)
        return p(100, 'p3', false)
    }).catch((e) => {
        result.push(e)
        return p(100, 'p4')
    }).finally(() => {
        result.push('finally')
    })
    
    setTimeout(ensure, 1000, result, ['p1', 'p2', 'p3', 'finally'], 'basic')
}

const test2 = () => {
    const result = []
    
    setTimeout(ensure, 1000, result, ['p1', 'p2', 'p3', 'finally'], 'basic')
}

const test3 = () => {
    const result = []
    
    setTimeout(ensure, 1000, result, ['p1', 'p2', 'p3', 'finally'], 'basic')
}

const test4 = () => {
    const result = []
    
    setTimeout(ensure, 1000, result, ['p1', 'p2', 'p3', 'finally'], 'basic')
}

const test5 = () => {
    const result = []
    
    setTimeout(ensure, 1000, result, ['p1', 'p2', 'p3', 'finally'], 'basic')
}

const test = () => {
    log('testing ...')
    test1()
    // test2()
    // test3()
    // test4()
    // test5()
}

test()



