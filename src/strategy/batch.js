
/**
 * ------------------------------------------------------------
 * batch 同时对N个视图进行全量更新
 * ------------------------------------------------------------
 */

var patch = require('./patch2')
var reconcile = require('./reconcile')

//如果正在更新一个子树,那么将它放到
var needRenderIds = []
var renderingID = false
avalon.suspendUpdate = 0


function batchUpdate(id) {
    if (renderingID) {
        return avalon.Array.ensure(needRenderIds, id)
    } else {
        renderingID = id
    }

    var scope = avalon.scopes[id]
    if (!scope || !document.nodeName || avalon.suspendUpdate) {
        return renderingID = null
    }
    var dom = scope.dom
    var steps = {count: 0}
    var oldTree = dom.vtree || []
    var vtree = scope.render(scope.synth || scope.vmodel, scope.local)
    if (!scope.isMount && oldTree) {
        //在最开始时,替换作用域的所有节点,确保虚拟DOM与真实DOM是对齐的
        //  var dom2 = avalon.vdomAdaptor(oldTree[0],'toDOM')
        //  dom.parentNode.replaceChild(dom2, dom)
        //  dom = scope.dom = dom2
        reconcile([dom], oldTree, dom.parentNode)
        scope.isMount = 1
    }
    avalon.diff(vtree, oldTree, steps)
    patch([dom], vtree, dom.parentNode, steps)
    if (scope.isMount === 1) {
        var vm = scope.vmodel
        var events = vm.$events["onReady"]
        if (events) {
            vm.fire('onReady')
            delete vm.$events.onReady
        }
        scope.isMount = 2
    }

    steps.count = 0
    dom.vtree = vtree
    var index = needRenderIds.indexOf(renderingID)
    renderingID = 0
    if (index > -1) {
        var removed = needRenderIds.splice(index, 1)
        return batchUpdate(removed[0])
    }

    var more = needRenderIds.shift()
    if (more) {
        batchUpdate(more)
    }
}



module.exports = avalon.batch = batchUpdate
